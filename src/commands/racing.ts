import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { findTeamByName, getGuildTone, getTeamSummary } from '../lib/queries.js';
import { generateStyledSummary } from '../lib/groq.js';

export const data = new SlashCommandBuilder()
  .setName('racing')
  .setDescription('Resumen de las últimas noticias de Racing Club generado por IA 🏆');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const team = await findTeamByName('racing');
    if (!team) {
      await interaction.editReply('No encontré a Racing Club en la base de datos. 🤔');
      return;
    }

    // Traemos el resumen pre-generado del cron (bullets sin tono)
    const summaryData = await getTeamSummary(team.id);
    const tone = await getGuildTone(interaction.guildId!);

    // Groq aplica el tono a los bullets — ultra-rápido (~0.5s)
    const response = await generateStyledSummary(team.name, summaryData?.bullets ?? null, tone);

    // Si hay datos, mostramos cuándo fue el último update
    const timestamp = summaryData
      ? `\n\n*⏱️ Actualizado: ${new Date(summaryData.generated_at).toLocaleTimeString('es-AR')}*`
      : '';

    await interaction.editReply({
      content: `## 🏎️ Noticias de Racing Club\n\n${response}${timestamp}`,
    });

  } catch (error) {
    console.error('[/racing] Error:', error);
    await interaction.editReply('Hubo un error inesperado. Intentá de nuevo en un momento.');
  }
}

