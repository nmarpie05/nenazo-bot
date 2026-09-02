import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { findTeamByName, getHeadlinesForTeam, getGuildTone } from '../lib/queries.js';
import { generateNewsSummary } from '../lib/gemini.js';

export const data = new SlashCommandBuilder()
  .setName('equipo')
  .setDescription('Resumen de noticias de cualquier equipo de la Primera División Argentina 🇦🇷')
  .addStringOption(option =>
    option
      .setName('nombre')
      .setDescription('Nombre del equipo (ej: Boca, River, San Lorenzo...)')
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  // Tomamos el valor del parámetro que escribió el usuario
  const nombreInput = interaction.options.getString('nombre', true);

  await interaction.deferReply();

  try {
    // 1. Buscamos el equipo por nombre o alias
    const team = await findTeamByName(nombreInput);

    if (!team) {
      await interaction.editReply(
        `No encontré ningún equipo con el nombre **"${nombreInput}"**.\n` +
        `Probá con el nombre completo o un alias conocido (ej: "Boca", "Xeneize", "River", "Millonario").`
      );
      return;
    }

    // 2. Traemos los titulares de las últimas 24hs
    const headlines = await getHeadlinesForTeam(team.id);

    // 3. Tono del servidor
    const tone = await getGuildTone(interaction.guildId!);

    // 4. Resumen con Gemini
    const summary = await generateNewsSummary(team.name, headlines, tone);

    // 5. Respondemos
    await interaction.editReply({
      content: `## ⚽ Noticias de ${team.name}\n\n${summary}`,
    });

  } catch (error) {
    console.error('[/equipo] Error:', error);
    await interaction.editReply('Hubo un error inesperado. Intentá de nuevo en un momento.');
  }
}
