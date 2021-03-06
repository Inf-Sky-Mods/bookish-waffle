const { ShardingManager } = require('discord.js');
if (process.env.MODE == 1) {
	const { beta_token } = require('./config.json');
	const manager = new ShardingManager('./bot.js', { token: beta_token, shardArgs: ['--ansi', '--color', '--trace-warnings'] });
	manager.spawn();
	manager.on('shardCreate', shard => {
		console.log(`Launched shard ${shard.id}`);
	});
}
 else if (process.env.MODE == 0) {
	const { token } = require('./config.json');
	const manager = new ShardingManager('./bot.js', { token, shardArgs: ['--ansi', '--color', '--trace-warnings'] });
	manager.spawn();
	manager.on('shardCreate', shard => {
		console.log(`Launched shard ${shard.id}`);
	});
}
