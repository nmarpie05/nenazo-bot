import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { findTeamByName, getGuildTone, getTeamSummary, getHeadlinesForTeam } from '../lib/queries.js';
import { generateStyledSummary, generateBullets } from '../lib/groq.js';

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

    // 2. Si no hay cache, generamos bullets al vuelo desde los headlines
    if (!bullets) {
      console.log(`[/equipo] No hay bullets cacheados para ${team.name}, generando al vuelo...`);
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
      content: `## 📰 Noticias de ${team.name}\n\n${response}${timestamp}`,
    });

  } catch (error) {
    console.error('[/equipo] Error:', error);
    await interaction.editReply('Hubo un error inesperado. Intentá de nuevo en un momento.');
  }
}
