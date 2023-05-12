import { createRequire } from "module";
const require = createRequire(import.meta.url);
import fetch from "node-fetch";
import qrcode from 'qrcode-terminal'
import { Client } from 'whatsapp-web.js'
const { MessageMedia } = require('whatsapp-web.js')
var mime = require('mime-types')
import axios from 'axios'
import memes from 'random-memes'
const fs = require('fs')
const client = new Client();

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {

    var msgBody = msg.body

    if (msg.body === '!ping') {
        msg.reply('pong');
    }

    if (msg.body.startsWith('spam')) {
        const spamMsg = msg.body.split('/')[1]
        const times = +msg.body.split('/')[2]
        for (var i = 0; i < times; i++) {
            client.sendMessage(msg.from, spamMsg);
        }
    }

    else if (msg.body === '-cmd') {
        msg.reply('```!ping = replies with pong\n!cmd = gives list of commands\n-sticker = replies with converted sticker (-sticker should be a caption on a photo)\n-meme = replies with a meme\n-joke = replies with a joke\nspam/yourMessage/noOfTimesToBeSend = spam a particular message a given no of times\nweather/locationName = gives the weather of the location\n!subject SubjectName = change the subject of the Group\n!desc DescriptionName = change the Description of the Group\n@tagE = will tag everyone```')
    }

    else if (msg.hasMedia && msg.body === '-sticker') {
        msg.downloadMedia().then(media => {
            if (media) {
                const mediaPath = './downloaded-media'
                if (!fs.existsSync(mediaPath)) {
                    fs.mkdirSync(mediaPath)
                }
                const extension = mime.extension(media.mimetype)
                const filename = new Date().getTime();
                const fullFileName = mediaPath + filename + '.' + extension;
                //Save file
                try {
                    fs.writeFileSync(fullFileName, media.data, { ecoding: 'base64' })
                    console.log('File Downloaded Successfully', fullFileName);
                    MessageMedia.fromFilePath(fullFileName)
                    client.sendMessage(msg.from, new MessageMedia(media.mimetype, media.data, filename), { sendMediaAsSticker: true, stickerAuthor: "Created by bot", stickerName: "Stickers" })
                    fs.unlinkSync(fullFileName)
                    console.log('File deleted SuccessFully');
                }
                catch (err) {
                    console.log('Failed to save the File', err);
                    console.log('File Deleted Successfully');
                }
            }
        })
    }

    else if (msg.body === '-meme') {
        try {
            const meme = await memes.fromReddit()
            // console.log(meme.image);
            const media = await MessageMedia.fromUrl(meme.image);
            msg.reply(media)
        }
        catch (err) {
            console.log('meme cant be generated' + err);
            msg.reply('meme cant be generated')
        }

    }

    else if (msg.body === '-joke') {
        const joke = await axios("https://v2.jokeapi.dev/joke/Any")
            .then(res => res.data)

        const jokeMsg = await client.sendMessage(msg.from, joke.setup || joke.joke);
        if (joke.delivery) {
            setTimeout(function () {
                jokeMsg.reply(joke.delivery);
            }, 3000);
        }
    }

    else if (msg.body.startsWith('weather/')) {
        const city = msg.body.split('/')[1]
        try {
            const response = await fetch(`http://api.weatherapi.com/v1/current.json?key=86979d983af54fabb0e182218223012&q=${city}`)


            if (response.status === 400) {
                msg.reply('Type a valid city name boi')
                throw new Error('City not found')
            }

            const data = await response.json()
            const cityName = `City = ${data.location.name}`
            const lat = `lat = ${data.location.lat}`
            const lon = `lon = ${data.location.lon}`
            const tempC = `temp = ${data.current.temp_c}°C`
            const cond = `cond = ${data.current.condition.text}`
            const wind = `wind = ${data.current.wind_kph}kph`

            const ans = `${cityName}\n${lat}\n${lon}\n${tempC}\n${cond}\n${wind}`
            msg.reply(ans)

        }
        catch (err) {
            console.log(err);
        }
    }

    else if (msg.body.startsWith('!sendto ')) {
        // Direct send a new message to specific id
        let number = msg.body.split(' ')[1];
        let messageIndex = msg.body.indexOf(number) + number.length;
        let message = msg.body.slice(messageIndex, msg.body.length);
        number = number.includes('@c.us') ? number : `${number}@c.us`;
        let chat = await msg.getChat();
        chat.sendSeen();
        client.sendMessage(number, message);

    }

    else if (msg.body.startsWith('!subject ')) {
        // Change the group subject
        let chat = await msg.getChat();
        console.log(chat.participants);
        if (chat.isGroup) {
            let newSubject = msg.body.slice(9);
            chat.setSubject(newSubject);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    }

    else if (msg.body.startsWith('!echo ')) {
        // Replies with the same message
        msg.reply(msg.body.slice(6));
    }

    else if (msg.body === '@tagE') {
        let chat = await msg.getChat()
        let participants = chat.participants
        console.log(participants);

        let everyone = ''
        participants.forEach((member) => everyone += `@+${member.id.user} `)
        msg.reply(everyone)
    }

    else if (msg.body.startsWith('!desc ')) {
        // Change the group description
        let chat = await msg.getChat();
        if (chat.isGroup) {
            let newDescription = msg.body.slice(6);
            chat.setDescription(newDescription);
        } else {
            msg.reply('This command can only be used in a group!');
        }
    }

    else if (msg.body === '!leave') {
        // Leave the group
        let chat = await msg.getChat();
        if (chat.isGroup) {
            chat.leave();
        } else {
            msg.reply('This command can only be used in a group!');
        }
    }

    else if (msg.body.startsWith('!join ')) {
        const inviteCode = msg.body.split(' ')[1];
        try {
            await client.acceptInvite(inviteCode);
            msg.reply('Joined the group!');
        } catch (e) {
            msg.reply('That invite code seems to be invalid.');
        }
    }

    else {
        try {
            const response = await fetch('http://localhost:5000/api', {
                method: 'POST',
                body: JSON.stringify({prompt : msgBody}),
                headers: {
                    "Content-Type": "application/json"
                }
            })
            if (!response.ok) {
                throw new Error('Something bad happened')
            }
            
            if(response.ok) {
                const data = await response.json();
                const parsedData = data.bot.trim();
                // console.log(parsedData)
                msg.reply(parsedData)
            }
        }
        catch (error) {
            console.log(error);
            msg.reply('Something went wrong')
        }
    }
});


client.on('group_join', (notification) => {
    // User has joined or been added to the group.
    console.log('join', notification);
    notification.reply('User joined.');
});

client.on('group_leave', (notification) => {
    // User has left or been kicked from the group.
    console.log('leave', notification);
    notification.reply('User left.');
});

client.initialize();
