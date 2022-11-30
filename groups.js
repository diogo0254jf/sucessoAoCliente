const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const port = process.env.PORT || 7007;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({
extended: true
}));
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'groups' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', '© BOT-ZDG - Iniciado');
  socket.emit('qr', './icon.svg');

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', '© BOT-ZDG QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', async () => {
    socket.emit('ready', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('message', '© BOT-ZDG Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('© BOT-ZDG Dispositivo pronto');
    //const chat = await client.getChatById('55119887623431633745589@g.us')
    //console.log(chat)
    const groups = await client.getChats()
    for (const group of groups){
      //console.log(group.id)
      if(group.id.server.includes('g.us')){
        socket.emit('message', group.id._serialized.split('@')[0]);
        console.log('Nome: ' + group.name + ' - ID: ' + group.id._serialized.split('@')[0]) 
      }
    }
});

// POST send-media URL
// app.post('/get-group', async (req, res) => {
//   console.log("chegou")
//   const grupos = [];
//   const groups = await client.getChats()
//     for (const group of groups){
//       //console.log(group.id)
//       if(group.id.server.includes('g.us')){
//         grupos.push('Nome: ' + group.name + ' - ID: ' + group.id._serialized.split('@')[0])
//       }
//     } 
//     res.status(200).send(grupos);
//     // return res.status(200).json({
//     //   grupos
//     // });
// });

client.on('authenticated', () => {
    socket.emit('authenticated', '© BOT-ZDG Autenticado!');
    socket.emit('message', '© BOT-ZDG Autenticado!');
    console.log('© BOT-ZDG Autenticado');
});

client.on('auth_failure', function() {
    socket.emit('message', '© BOT-ZDG Falha na autenticação, reiniciando...');
    console.error('© BOT-ZDG Falha na autenticação');
});

client.on('change_state', state => {
  console.log('© BOT-ZDG Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  socket.emit('message', '© BOT-ZDG Cliente desconectado!');
  console.log('© BOT-ZDG Cliente desconectado', reason);
  client.initialize();
});
});

const findGroupByName = async function(name) {
  const group = await client.getChats().then(chats => {
    return chats.find(chat => 
      chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
    );
  });
  return group;
}

// Send message to group
// You can use chatID or group name, yea!
app.post('/send-group-message', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const message = req.body.message;

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      return res.status(422).json({
        status: false,
        message: 'No group found with name: ' + groupName
      });
    }
    chatId = group.id._serialized;
  }

  client.sendMessage(chatId, message).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

app.post('/send-group-media', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('file').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const filePath = req.body.file;
  console.log(groupName,filePath)
  const media = await MessageMedia.fromUrl(filePath);

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      return res.status(422).json({
        status: false,
        message: 'No group found with name: ' + groupName
      });
    }
    chatId = group.id._serialized;
  }
  client.sendMessage(chatId, media).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

app.post('/send-group-audio', [
  body('id').custom((value, { req }) => {
    if (!value && !req.body.name) {
      throw new Error('Invalid value, you can use `id` or `name`');
    }
    return true;
  }),
  body('file').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  let chatId = req.body.id;
  const groupName = req.body.name;
  const filePath = req.body.file;
  const media = await MessageMedia.fromFilePath(filePath);

  // Find the group by name
  if (!chatId) {
    const group = await findGroupByName(groupName);
    if (!group) {
      return res.status(422).json({
        status: false,
        message: 'No group found with name: ' + groupName
      });
    }
    chatId = group.id._serialized;
  }
  client.sendMessage(chatId, media, {sendAudioAsVoice: true}).then(response => {
    res.status(200).json({
      status: true,
      response: response
    });
  }).catch(err => {
    res.status(500).json({
      status: false,
      response: err
    });
  });
});

// POST add-user
app.post('/add-user', [
  body('user').notEmpty(),
  body('group').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const user = req.body.user;
  const group = req.body.group + '@g.us';
  const chat = await client.getChatById(group);

  const numberDDI = user.substr(0, 2);
  const numberDDD = user.substr(2, 2);
  const numberUser = user.substr(-8, 8);

  if (numberDDI !== "55") {
    const numberZDG = user + "@c.us";
    await chat.addParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Usuário adicionado',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Usuário não adicionado',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    await chat.addParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    await chat.addParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }

  // await chat.addParticipants([user]).then(response => {
  //   res.status(200).json({
  //     status: true,
  //     message: 'BOT-ZDG Usuário adicionado',
  //     response: response
  //   });
  //   }).catch(err => {
  //   res.status(500).json({
  //     status: false,
  //     message: 'BOT-ZDG Usuário removido',
  //     response: err.text
  //   });
  //   });

});

// POST remove-user
app.post('/remove-user', [
  body('user').notEmpty(),
  body('group').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const user = req.body.user;
  const group = req.body.group + '@g.us';
  const chat = await client.getChatById(group);

  const numberDDI = user.substr(0, 2);
  const numberDDD = user.substr(2, 2);
  const numberUser = user.substr(-8, 8);

  if (numberDDI !== "55") {
    const numberZDG = user + "@c.us";
    await chat.removeParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Usuário removido',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Usuário não removido',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    await chat.removeParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    await chat.removeParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }

  // await chat.removeParticipants([user]).then(response => {
  //   res.status(200).json({
  //     status: true,
  //     message: 'BOT-ZDG Usuário adicionado',
  //     response: response
  //   });
  //   }).catch(err => {
  //   res.status(500).json({
  //     status: false,
  //     message: 'BOT-ZDG Usuário removido',
  //     response: err.text
  //   });
  //   });

});

// POST add-admin
app.post('/add-admin', [
  body('user').notEmpty(),
  body('group').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const user = req.body.user;
  const group = req.body.group + '@g.us';
  const chat = await client.getChatById(group);

  const numberDDI = user.substr(0, 2);
  const numberDDD = user.substr(2, 2);
  const numberUser = user.substr(-8, 8);

  if (numberDDI !== "55") {
    const numberZDG = user + "@c.us";
    await chat.promoteParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Admin adicionado',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Admin não adicionado',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    await chat.promoteParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    await chat.promoteParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }

  // await chat.promoteParticipants([user]).then(response => {
  //   res.status(200).json({
  //     status: true,
  //     message: 'BOT-ZDG Usuário adicionado',
  //     response: response
  //   });
  //   }).catch(err => {
  //   res.status(500).json({
  //     status: false,
  //     message: 'BOT-ZDG Usuário removido',
  //     response: err.text
  //   });
  //   });

});

// POST demote-admin
app.post('/demote-admin', [
  body('user').notEmpty(),
  body('group').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const user = req.body.user;
  const group = req.body.group + '@g.us';
  const chat = await client.getChatById(group);

  const numberDDI = user.substr(0, 2);
  const numberDDD = user.substr(2, 2);
  const numberUser = user.substr(-8, 8);

  if (numberDDI !== "55") {
    const numberZDG = user + "@c.us";
    await chat.demoteParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Admin removido',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Admin não removido',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    await chat.demoteParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    await chat.demoteParticipants([numberZDG]).then(response => {
    res.status(200).json({
      status: true,
      message: 'BOT-ZDG Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'BOT-ZDG Mensagem não enviada',
      response: err.text
    });
    });
  }

  // await chat.demoteParticipants([user]).then(response => {
  //   res.status(200).json({
  //     status: true,
  //     message: 'BOT-ZDG Usuário adicionado',
  //     response: response
  //   });
  //   }).catch(err => {
  //   res.status(500).json({
  //     status: false,
  //     message: 'BOT-ZDG Usuário removido',
  //     response: err.text
  //   });
  //   });

});


client.on('group_join', async () => {
  const groups = await client.getChats()
  console.log('-----------------------------\nBOT-ZDG Grupos atualizados:\n-----------------------------') 
  for (const group of groups){
    if(group.id.server.includes('g.us')){
      console.log('Nome: ' + group.name + ' - ID: ' + group.id._serialized.replace(/\D/g,'')) 
    }
  }
});

client.on('group_leave', async () => {
  const groups = await client.getChats()
  console.log('-----------------------------\nBOT-ZDG Grupos atualizados:\n-----------------------------') 
  for (const group of groups){
    if(group.id.server.includes('g.us')){
      console.log('Nome: ' + group.name + ' - ID: ' + group.id._serialized.replace(/\D/g,'')) 
    }
  }
});
   
server.listen(port, function() {
        console.log('App running on *: ' + port);
});
