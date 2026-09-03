import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { getAllTeams } from '../lib/queries.js';

export const data = new SlashCommandBuilder()
  .setName('equipos')
  .setDescription('Muestra la lista de todos los equipos del fútbol argentino disponibles ⚽');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const teams = await getAllTeams();

    if (teams.length === 0) {
      await interaction.editReply('No hay equipos registrados en la base de datos por el momento. 😅');
      return;
    }

    const teamList = teams.map((t, i) => `**${i + 1}. ${t.name}** \`(${t.short_name || t.name})\``).join('\n');

    const embed = new EmbedBuilder()
      .setTitle('🇦🇷 Equipos Disponibles en Nenazo Bot')
      .setDescription(`Podés consultar las noticias de cualquiera de estos **${teams.length} clubes** usando el comando \`/equipo <nombre>\`:\n\n${teamList}`)
      .setColor(0x3498db)
      .setFooter({ text: 'Tip: Podés buscar por nombre completo o apodos (ej: Boca, Xeneize, Millo, La Academia, Pincha, etc.)' });

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('[/equipos] Error:', error);
    await interaction.editReply('Hubo un error al obtener la lista de equipos. Intentá de nuevo más tarde.');
  }
}
