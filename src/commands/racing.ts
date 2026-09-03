import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { findTeamByName, getGuildTone, getTeamSummary, getHeadlinesForTeam } from '../lib/queries.js';
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

    const tone = await getGuildTone(interaction.guildId!);

    // 1. Intentamos usar bullets cacheados (camino rápido)
    let summaryData = await getTeamSummary(team.id);
    let bullets = summaryData?.bullets ?? null;

    // 2. Si no hay cache, armamos los bullets directo desde los titulares (SIN LLM)
    if (!bullets) {
      console.log(`[/racing] No hay bullets cacheados, usando headlines directo...`);
      const headlines = await getHeadlinesForTeam(team.id, 10);
      if (headlines.length > 0) {
        bullets = headlines.map(h => `• ${h}`).join('\n');
        console.log(`[/racing] ${headlines.length} headlines formateados como bullets`);
      }
    }

    // 3. Groq aplica el tono a los bullets (UNA sola llamada LLM)
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
