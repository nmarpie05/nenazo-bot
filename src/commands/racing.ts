import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { findTeamByName, getHeadlinesForTeam, getGuildTone } from '../lib/queries.js';
import { generateNewsSummary } from '../lib/gemini.js';

export const data = new SlashCommandBuilder()
  .setName('racing')
  .setDescription('Resumen de las últimas noticias de Racing Club generado por IA 🏆');

export async function execute(interaction: ChatInputCommandInteraction) {
  // Defer reply: Le dice a Discord "estoy procesando, dame unos segundos"
  // Es OBLIGATORIO si la respuesta tarda más de 3 segundos (Gemini puede tardar un poco)
  await interaction.deferReply();

  try {
    // 1. Buscamos Racing en la base de datos
    const team = await findTeamByName('racing');
    if (!team) {
      await interaction.editReply('No encontré a Racing Club en la base de datos. 🤔');
      return;
    }

    // 2. Traemos los titulares de las últimas 24hs
    const headlines = await getHeadlinesForTeam(team.id);

    // 3. Obtenemos el tono configurado para este servidor
    const tone = await getGuildTone(interaction.guildId!);

    // 4. Le pedimos a Gemini que genere el resumen
    const summary = await generateNewsSummary(team.name, headlines, tone);

    // 5. Respondemos en Discord con el resumen
    await interaction.editReply({
      content: `## 🏎️ Noticias de Racing Club\n\n${summary}`,
    });

  } catch (error) {
    console.error('[/racing] Error:', error);
    await interaction.editReply('Hubo un error inesperado. Intentá de nuevo en un momento.');
  }
}
