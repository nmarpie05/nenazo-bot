import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { findTeamByName, getGuildTone, getTeamSummary, getHeadlinesForTeam } from '../lib/queries.js';
import { generateStyledSummary } from '../lib/groq.js';
import { QUOTA_EXHAUSTED_MESSAGE } from '../lib/gemini.js';

export const data = new SlashCommandBuilder()
  .setName('equipo')
  .setDescription('Resumen de las últimas noticias del equipo que elijas ⚽')
  .addStringOption(option =>
    option.setName('nombre')
      .setDescription('Nombre del equipo (ej: Boca, River, Independiente)')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const query = interaction.options.getString('nombre', true);
  await interaction.deferReply();

  try {
    const team = await findTeamByName(query);
    if (!team) {
      await interaction.editReply(`No encontré al equipo "${query}" en la base de datos. 🤔`);
      return;
    }

    const tone = await getGuildTone(interaction.guildId!);

    // 1. Intentamos usar bullets cacheados (camino rápido)
    let summaryData = await getTeamSummary(team.id);
    let bullets = summaryData?.bullets ?? null;

    // 2. Si no hay cache, armamos los bullets directo desde los titulares (SIN LLM)
    if (!bullets) {
      console.log(`[/equipo] No hay bullets cacheados para ${team.name}, usando headlines directo...`);
      const headlines = await getHeadlinesForTeam(team.id, 10);
      if (headlines.length > 0) {
        bullets = headlines.map(h => `• ${h}`).join('\n');
        console.log(`[/equipo] ${headlines.length} headlines formateados como bullets para ${team.name}`);
      }
    }

    // 3. Groq aplica el tono a los bullets (UNA sola llamada LLM)
    const response = await generateStyledSummary(team.name, bullets, tone);

    const timestamp = summaryData
      ? `\n\n*⏱️ Actualizado: ${new Date(summaryData.generated_at).toLocaleTimeString('es-AR')}*`
      : '';

    let content = `## 📰 Noticias de ${team.name}\n\n${response}${timestamp}`;

    if (response === QUOTA_EXHAUSTED_MESSAGE && bullets) {
      content = `## 📰 Noticias de ${team.name}\n\n${response}\n\n**📌 Titulares recientes:**\n${bullets}${timestamp}`;
    }

    await interaction.editReply({ content });

  } catch (error) {
    console.error('[/equipo] Error:', error);
    await interaction.editReply('Hubo un error inesperado. Intentá de nuevo en un momento.');
  }
}
