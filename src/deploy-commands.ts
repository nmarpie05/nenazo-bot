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
  // Usamos ! porque ya validamos arriba que no son undefined
  const rest = new REST().setToken(token!);

  try {
    console.log(`Enviando ${commands.length} comandos a la API de Discord...`);

    // 1. Registramos de forma GLOBAL (para todos los servidores futuros)
    const globalData = await rest.put(
      Routes.applicationCommands(clientId!),
      { body: commands },
    ) as any[];
    console.log(`¡Éxito! Se actualizaron ${globalData.length} comandos globales en Discord.`);

    // 2. Si hay un GUILD_ID configurado, los registramos también directo a ese servidor (actualización INSTANTÁNEA)
    if (guildId) {
      const guildData = await rest.put(
        Routes.applicationGuildCommands(clientId!, guildId!),
        { body: commands },
      ) as any[];
      console.log(`¡Éxito! Se actualizaron ${guildData.length} comandos de servidor instantáneos (Guild: ${guildId}).`);
    }
  } catch (error) {
    console.error("Error al registrar los comandos:", error);
  }
}

deploy();
