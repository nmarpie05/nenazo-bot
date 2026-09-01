import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Responde con Pong! Útil para probar si el bot está vivo.');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Respondemos al usuario. interaction.reply es la forma estándar de contestar a un slash command.
  await interaction.reply('¡Pong! 🏓 El bot de fútbol está operativo.');
}
