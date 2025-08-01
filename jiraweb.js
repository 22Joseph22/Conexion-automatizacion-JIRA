const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

// Configuración de Jiranet
const JIRA_URL = '';
const JIRA_EMAIL = '';
const JIRA_TOKEN = '';

// Mapear palabras clave a ID de transición
const TRANSITIONS = {
  'pendiente': '11',
  'en curso': '21',
  'finalizado': '31', // Asegúrate que este ID sea correcto en Jira
};

app.use(express.json());

// Función para mover tareas
const moverTarea = async (issueKey, transitionId, accion) => {
  console.log(`➡️ Moviendo ${issueKey} a "${accion}"...`);
  try {
    await axios.post(
      `${JIRA_URL}/rest/api/3/issue/${issueKey}/transitions`,
      { transition: { id: transitionId } },
      {
        auth: { username: JIRA_EMAIL, password: JIRA_TOKEN },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ ${issueKey} movida a "${accion}".`);
  } catch (err) {
    console.error(`❌ Error al mover ${issueKey}:`, err.response?.data || err.message);
  }
};

// Función para leer texto plano desde ADF
const extraerTextoPlanoDesdeADF = (description) => {
  if (typeof description === 'string') return description;
  if (description?.content) {
    return description.content
      .flatMap(parrafo => parrafo.content?.map(texto => texto.text || '') || [])
      .join(' ');
  }
  return '';
};

// Webhook de Jira
app.post('/jira-webhook', async (req, res) => {
  try {
    const event = req.body;
    const issueKey = event.issue?.key;
    console.log('📨 Webhook de JIRA recibido:', issueKey);

    let texto = '';

    if (event.webhookEvent === 'comment_created' || event.webhookEvent === 'comment_updated') {
      texto = (event.comment?.body || '').toLowerCase();
    } else if (event.webhookEvent === 'jira:issue_created' || event.webhookEvent === 'jira:issue_updated') {
      texto = extraerTextoPlanoDesdeADF(event.issue?.fields?.description || '').toLowerCase();
    }

    if (texto.includes('en curso')) {
      await moverTarea(issueKey, TRANSITIONS['en curso'], 'En curso');
    } else if (texto.includes('finalizado')) {
      await moverTarea(issueKey, TRANSITIONS['finalizado'], 'Finalizado');
    } else if (texto.includes('pendiente')) {
      await moverTarea(issueKey, TRANSITIONS['pendiente'], 'Pendiente');
    } else {
      console.log('ℹ️ No se encontró palabra clave válida.');
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error en webhook Jira:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// Webhook de GitHub
app.post('/github-webhook', async (req, res) => {
  try {
    const payload = req.body;
    const commits = payload.commits || [];

    for (const commit of commits) {
      const message = commit.message.toLowerCase();
      console.log(`💬 Commit: "${message}"`);

      const regex = /(GIT-\d+)\s+(pendiente|en curso|finalizado)/i;
      const match = message.match(regex);

      if (!match) {
        console.log('⚠️ Commit sin palabra clave.');
        continue;
      }

      const issueKey = match[1];
      const estado = match[2].toLowerCase();
      const transitionId = TRANSITIONS[estado];

      if (transitionId) {
        await moverTarea(issueKey, transitionId, estado);
      } else {
        console.log(`⚠️ No hay transición para: "${estado}"`);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error en webhook GitHub:', error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
