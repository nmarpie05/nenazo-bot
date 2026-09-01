import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Faltan variables en el .env (DISCORD_TOKEN, CLIENT_ID, GUILD_ID)");
  process.exit(1);
}

const commands: any[] = [];
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

async function deploy() {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(pathToFileURL(filePath).href);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    }
  }

  // Preparamos el cliente REST
  const rest = new REST().setToken(token);

  try {
    console.log(`Enviando ${commands.length} comandos a la API de Discord...`);

    // Usamos applicationGuildCommands (comandos de servidor) en vez de comandos globales.
    // Los comandos globales tardan mucho en actualizarse en la app de Discord (caché).
    // Los comandos de servidor se actualizan instantáneamente, ideal para desarrollo.
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    ) as any[];

    console.log(`¡Éxito! Se actualizaron ${data.length} comandos en el servidor.`);
  } catch (error) {
    console.error("Error al registrar los comandos:", error);
  }
}

deploy();
