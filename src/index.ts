import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { startCronJob } from './cron.js';

// Cargamos las variables de entorno desde el archivo .env
dotenv.config();

// Inicializamos el cliente de Discord. 
// Los "Intents" le dicen a Discord qué eventos queremos escuchar.
// Guilds = Servidores. Necesario para que el bot funcione en canales de un servidor.
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Usamos una Collection (un Map optimizado de discord.js) para guardar los comandos en memoria
const commands = new Collection<string, any>();

// Hack necesario para usar __dirname en ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargamos dinámicamente los comandos desde la carpeta src/commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

(async () => {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(pathToFileURL(filePath).href);

    // Validamos que el archivo exporte 'data' y 'execute'
    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
      console.log(`[OK] Comando /${command.data.name} cargado en memoria.`);
    } else {
      console.log(`[WARNING] El comando en ${filePath} no tiene el formato correcto.`);
    }
  }
})();

// Evento: Cuando el bot se conecta exitosamente al Gateway
client.once(Events.ClientReady, (readyClient) => {
  console.log(`🤖 ¡Bot conectado exitosamente como ${readyClient.user.tag}!`);

  // Arrancamos el cron job de ingesta de noticias
  startCronJob();
});

// Evento: Cuando un usuario ejecuta un slash command
client.on(Events.InteractionCreate, async (interaction) => {
  // Si no es un comando de chat (slash command), ignoramos
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);

  if (!command) {
    console.error(`No se encontró el comando ${interaction.commandName}.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error ejecutando ${interaction.commandName}:`, error);
    // Le avisamos al usuario que hubo un error para que no se quede esperando
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '¡Hubo un error al ejecutar este comando!', ephemeral: true });
    } else {
      await interaction.reply({ content: '¡Hubo un error al ejecutar este comando!', ephemeral: true });
    }
  }
});

// Conectamos a Discord
client.login(process.env.DISCORD_TOKEN);
