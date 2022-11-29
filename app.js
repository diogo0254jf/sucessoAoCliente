const { Client, LocalAuth } = require('whatsapp-web.js');
const fsPromises = require("fs/promises");
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: false }
});


client.initialize();

client.on('qr', (qr) => {
    console.log('QRCode recebido', qr);
});

client.on('authenticated', () => {
    console.log('Autenticado');
});

client.on('auth_failure', msg => {
    console.error('Falha na autenticação', msg);
});

client.on('ready', () => {
    console.log('Dispositivo pronto');

});

client.on('message', async msg => {
    //console.log('Mensagem recebida', msg);
    const chats = await client.getChats();
    //console.log(chats);
    let dataFile = [];
    if (!fs.existsSync("contatos.json")){
      fs.writeFileSync("contatos.json", JSON.stringify(dataFile));;
    }
    for (const chat of chats) {
        console.log(chat.id.user);
        //console.dir(chat.id.user, {'maxArrayLength': null});
        // const user = chat.id.user;
        // async function readWriteFileJson() {
        //     var data = fs.readFileSync("contatos.json");
        //     var myObject = JSON.parse(data);
        //     let newData = {
        //         user: user,
        //     };
        //       await myObject.push(newData);
        //       await fsPromises.writeFile("contatos.json", JSON.stringify(myObject), (err) => {
        //         // Error checking
        //         if (err) throw err;
        //         //console.log("New data added");
        //       });    
        //   }
        //   await readWriteFileJson();
    }
    
    
    if (msg.body === 'oi'){
        msg.reply('olá 1');
    }
    else if (msg.body.startsWith('Como') && msg.body !== null){
        msg.reply('olá 2');
    }
    else if (msg.body.includes('alô') && msg.body !== null){
        msg.reply('olá 3');
    }
    else if (msg.body !== null){
        msg.reply('*BOT-ZDG*: Operadores JS\n1- ====\n2- startsWith\n3- includes');
    }
});

client.on('change_state', state => {
    console.log('Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado', reason);
});
