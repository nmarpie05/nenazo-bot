import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { setGuildTone } from '../lib/queries.js';

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configuración del bot para este servidor (solo administradores)')
  .addSubcommand(sub =>
    sub
      .setName('tono')
      .setDescription('Cambia el "personaje" o tono con el que la IA responde en este servidor')
      .addStringOption(option =>
        option
          .setName('descripcion')
          .setDescription('Describí cómo querés que responda el bot (ej: "Respondé como un pirata fanático del fútbol")')
          .setRequired(true)
          .setMaxLength(500) // Limitamos para no mandar prompts gigantes a Gemini
      )
  )
  // Restringimos el comando para que solo lo puedan usar administradores del servidor
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  // Obtenemos el subcomando que ejecutó el usuario
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'tono') {
    const descripcion = interaction.options.getString('descripcion', true);

    try {
      // Guardamos el nuevo tono en Supabase para este servidor
      await setGuildTone(interaction.guildId!, descripcion);

      await interaction.reply({
        content: `✅ ¡Tono actualizado! A partir de ahora, el bot en este servidor va a responder así:\n\n> ${descripcion}`,
        ephemeral: true, // Solo lo ve el admin que ejecutó el comando
      });
    } catch (error) {
      console.error('[/config tono] Error:', error);
      await interaction.reply({
        content: 'Hubo un error al guardar la configuración. Intentá de nuevo.',
        ephemeral: true,
      });
    }
  }
}
