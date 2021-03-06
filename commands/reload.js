module.exports = {
  name: 'reload',
  description: 'BOT OWNER ONLY',
  guildOnly: false,
  testing: false,
  cooldown: 0,
  args: true,
  execute(message, args, Client) {
    if (message.author.id !== '127888387364487168') return;
    if(!args || args.size < 1) return message.reply('you must provide a command name to reload.');
    const commandName = args[0];
    // Check if the command exists and is valid
    if(!Client.commands.has(commandName)) {
      return message.reply('that command does not exist');
    }
    // the path is relative to the *current folder*, so just ./filename.js
    delete require.cache[require.resolve(`./${commandName}.js`)];
    // We also need to delete and reload the command from the client.commands Enmap
    Client.commands.delete(commandName);
    const props = require(`./${commandName}.js`);
    Client.commands.set(commandName, props);
    message.reply(`the command ${commandName} has been reloaded`);
  }
};
