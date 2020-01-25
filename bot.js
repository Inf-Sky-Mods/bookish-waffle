String.prototype.titleCase = function () {
   var splitStr = this.toLowerCase().split(' ');
   for (var i = 0; i < splitStr.length; i++) {
       splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
   }
   return splitStr.join(' '); 
}
const fs = require('fs');
const Discord = require('discord.js');
let { token, prefix, nodes, dblToken, ADLToken, mongo } = require('./config.json');
const client = new Discord.Client({ disableEveryone: true });
const { PlayerManager } = require('discord.js-lavalink');
const fetch = require('node-fetch');
const { KoFi } = require('kofi.js');
const DBL = require('dblapi.js');
client.prefix = prefix

if (process.env.MODE == 0) {
	const kofi = new KoFi('/notdonation', 4200);
	client.dbl = new DBL(dblToken, client);
	client.prefix = `${process.env.PREFIX} `;
	kofi.start(() => {
		console.log('Started on port 4200');
	});
	client.dbl.on('error', e => {
		console.error(e);
	});
	kofi.on('donation', donation => {
		const amount = parseInt(donation.amount);
		const id = parseInt(donation.message);
		client.db.push('donations', donation);
		if (amount < 3) return;
		if (!donation.message || isNaN(id)) return;
		if (!client.db.get('donor').includes(`member_${id}`)) return;
		client.db.push('donor', `member_${id}`);
	});
}


client.queue = new Map();
client.commands = new Discord.Collection();
client.fetchSongs = async (string, amount) => {
	const search = encodeURIComponent(string);
	if (!amount) throw 'SEARCH LIMIT REQUIRED';
	const res = await fetch(`http://${client.lavalink.host}:${client.lavalink.port}/loadtracks?identifier=${search}`, {
		headers: { 'Authorization': client.lavalink.password }
	}).catch(err => {
		console.error(err);
		throw err;
	});
	const res2 = await res.json();
	if (!res2) throw 'NO RESPONSE';
	if (!res2.tracks) return 'NO TRACKS';
	res2.tracks.length = parseInt(amount);
	if (typeof res2.tracks.length == 'NaN') throw 'IMPROPER AMOUNT'
	return res2.tracks;
};
client.fetchInfo = async (string, amount) => {
	const search = encodeURIComponent(string);
        const res = await fetch(`http://${client.lavalink.host}:${client.lavalink.port}/loadtracks?identifier=${search}`, {
                headers: { 'Authorization': client.lavalink.password }
        }).catch(err => {
                console.error(err);
                throw err;
        });
        const res2 = await res.json();
        if (!res2) throw 'NO RESPONSE';
        return res2;
};


client.db = require('quick.db');
client.mongoose = require('mongoose');
client.mongoose.connect("mongodb://jay:1234@localhost:27017/planet", {useNewUrlParser: true, useUnifiedTopology: true});
client.mongoose.connection.on('error', console.error.bind(console, "connection error:"));
client.mongoose.connection.once('open', function() {
	console.log('Connection successful with MongoDB!')
});
client.mongoose.UserModel = require('./Schema/UserSchema.js');

client.nekosSafe = new (require('nekos.life'))().sfw;
client.nekosUnSafe = new (require('nekos.life'))().nsfw;
client.pushStats = async (Token) => {
	const body = {
		'users': client.users.size,
		'servers': client.guilds.size,
		'shards': client.shard.count
	};
	const res = await fetch(`https://abstractlist.net/api/bot/${client.user.id}/stats`, {
		method: 'post',
		body: JSON.stringify(body),
		headers: {
			'Content-type': 'application/json', 'Authorization': Token
		}
	});
	return await res.json();
};
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}
delete client.nekosUnSafe.neko;
delete client.nekosUnSafe.avatar;
if (process.env.MODE === 0) {
	Object.entries(client.nekosUnSafe).map(x => {
		client.commands.set(x[0].toLowerCase(), {
			name: x[0].toLowerCase(),
			description: 'Just your average lewd',
				category: 'nsfw',
			cooldown: 5,
			voterOnly: true,
			donatorOnly: true,
			async execute(message) {
				if (!message.channel.nsfw) return message.channel.send('Nope. It\'s lewd. (Use the command in an nsfw channel.)');
				message.channel.send(new (require('discord.js').MessageEmbed)().setImage((await x[1]()).url));
			}
		});
	});
}
const cooldowns = new Discord.Collection();
client.on('ready', async () => {

	console.log('Ready!');
	client.user.setActivity(`${client.prefix}help for help.`)
		.then(presence => console.log(`Activity is ${presence.activity ? presence.activity.name : 'none'}`))
		.catch(console.error);
	client.lavalink = {
		host: nodes[0].host,
		password: nodes[0].password,
		port: nodes[0].port
	};
	client.manager = new PlayerManager(client, nodes, {
		user: client.user.id,
		shards: client.shard.count
	});
	try {
		setInterval(async () => {
			const body = {
				'users': client.users.size,
				'servers': client.guilds.size,
				'shards': client.shard.count
			};
			await fetch(`https://abstractlist.net/api/bot/${client.user.id}/stats`, {
				method: 'post',
				body: JSON.stringify(body),
				headers: { 'Content-type': 'application/json', 'Authorization': ADLToken }
			});
		}, 1800000);
	} catch(e) {
		console.error(e);
	}
});
client.login(process.env.DISCORD_TOKEN)
client.on('error', console.log);
client.on('disconnect', console.log);
client.on('guildCreate', g => {
	if (!g.available) return;
	const embed = new Discord.MessageEmbed()
		.setTitle('Guild added.')
		.addField('Guild Name', g.name)
		.addField('Guild ID', g.id)
		.addField('Guild Onwer', g.owner.user.username)
		.addField('Guild Members (Excluding bots)', g.members.filter(m => !m.user.bot).size)
		.setColor('GREEN');
	return client.channels.get('661669168009052200').send(embed);
});
client.on('guildDelete', g => {
	if (!g.available) return;
	const embed = new Discord.MessageEmbed()
		.setTitle('Guild removed.')
		.addField('Guild Name', g.name)
		.addField('Guild ID', g.id)
		.addField('Guild Onwer', g.owner.user.username)
		.addField('Guild Members (Excluding bots)', g.members.filter(m => !m.user.bot).size)
		.setColor('RED');
	return client.channels.get('661669168009052200').send(embed);
});
client.on('voiceStateUpdate', (oldState, newState) => {
	if (newState.member == newState.guild.me) {
		if (oldState === 'No need') return;
		if (!oldState.channel) return;
		if (!newState.channel) {
			if (!client.queue.get(newState.guild.id) && !client.manager.get(newState.guild.id)) return;
			try {
				client.queue.delete(newState.guild.id);
				console.log(newState.guild.name + ' disconnected the bot and did not have a queue.');
			} catch (e) {
				console.error(e);
			}
			try {
				client.manager.leave(newState.guild.id);
				console.log(newState.guild.name + ' disconnected the bot and had manager still active.');
			} catch (e) {
				console.error(e);
			}
			client.queue.delete(newState.guild.id);
			return client.manager.get(newState.guild.id);
		}
	}
})

client.on('message', async (message) => {
	if (!message.content.toLowerCase().startsWith(client.prefix) || message.author.bot) return;
	const args = message.content.slice(client.prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();
	const command = client.commands.get(commandName) ||
		client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;
	if (typeof client.dbl !== 'undefined') {
		const voted = await client.dbl.hasVoted(message.author.id);
		if (command.voterOnly && !command.donatorOnly && !voted) return message.channel.send('Woah there! This command is for voters only! Vote on DBL to use this command. Vote here!\n<https://top.gg/bot/628802763123589160/vote>');
		if (command.donatorOnly && !command.voterOnly && !client.db.get('donor').includes(`member_${message.author.id}`)) return message.channel.send(`Woah there! This command is for donators only! Donate more than one cup of coffee on KoFi to use these commands (Be sure to include your user ID: \`${message.author.id}\`). Donation link: <https://www.ko-fi.com/earthchandiscord>`);
		if (command.voterOnly && command.donatorOnly && !voted && !client.db.get('donor').includes(`member_${message.author.id}`)) return message.channel.send(`Woah there! This command is only for voters/donators! Vote on Discord Bot List to use this command or donate more than just a cup off coffee on KoFi with your user ID in the message (\`${message.author.id}\`) included in the message.\nDonation link: <https://www.ko-fi.com/earthchandiscord>\nVote link: <https://top.gg/bot/628802763123589160/vote>`);
	};
	if (command.testing && message.author.id != 127888387364487168) return message.reply(`${command.name} is currently in its testing stage.`);
	if (command.guildOnly && message.channel.type !== 'text') return message.reply('I can\'t execute that command inside DMs!');

	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${client.prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	if (!cooldowns.has(command.name)) cooldowns.set(command.name, new Discord.Collection());

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (!timestamps.has(message.author.id)) {
		timestamps.set(message.author.id, now);
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
	}
	else {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}

		timestamps.set(message.author.id, now);
		setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
	}

	try {
		command.execute(message, args, client);
	}
	catch (error) {
		console.error(`${message.guild.id} | ${command.name}:\n${error.stack}`);
		message.reply(`there was an error trying to execute that command! Report this to the creator of this bot: \`${error}\``);
	}
});
