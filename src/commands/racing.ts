import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { findTeamByName, getGuildTone, getTeamSummary, getHeadlinesForTeam } from '../lib/queries.js';
import { generateStyledSummary, generateBullets } from '../lib/groq.js';

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

    const tone = await getGuildTone(interaction.guildId!);

    // 1. Intentamos usar bullets cacheados (camino rápido)
    let summaryData = await getTeamSummary(team.id);
    let bullets = summaryData?.bullets ?? null;

    // 2. Si no hay cache, generamos bullets al vuelo desde los headlines
    if (!bullets) {
      console.log(`[/racing] No hay bullets cacheados, generando al vuelo...`);
      const headlines = await getHeadlinesForTeam(team.id, 10);
      if (headlines.length > 0) {
        bullets = await generateBullets(team.name, headlines);
      }
    }

    // 3. Groq aplica el tono a los bullets
    const response = await generateStyledSummary(team.name, bullets, tone);

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
