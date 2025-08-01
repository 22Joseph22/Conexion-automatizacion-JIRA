const axios = require('axios');
const Table = require('cli-table3');

const JIRA_URL = '';
const JIRA_EMAIL = '';
const JIRA_TOKEN = '';

// Cambia aquí la clave del proyecto o pásala como argumento
const JIRA_PROJECT_KEY = process.argv[2] || 'GIT';

const auth = {
  username: JIRA_EMAIL,
  password: JIRA_TOKEN
};

const EPIC_LINK_FIELD = 'customfield_10014';

// Función para extraer texto plano desde ADF (descripciones en Jira)
function extraerTextoPlanoDesdeADF(description) {
  if (typeof description === 'string') return description;
  if (description?.content) {
    return description.content
      .flatMap(parrafo => parrafo.content?.map(texto => texto.text || '') || [])
      .join(' ');
  }
  return 'Sin descripción';
}

async function obtenerNombreEpic(epicKey) {
  try {
    const response = await axios.get(`${JIRA_URL}/rest/api/3/issue/${epicKey}`, { auth });
    return response.data.fields.summary || 'Nombre de epic no encontrado';
  } catch (error) {
    return 'Nombre de epic no encontrado';
  }
}

async function obtenerTareas() {
  try {
    const jql = `project=${encodeURIComponent(JIRA_PROJECT_KEY)} AND issuetype != Epic`;
    const tareasRes = await axios.get(`${JIRA_URL}/rest/api/3/search?jql=${jql}`, { auth });
    let tareas = tareasRes.data.issues;

    tareas.sort((a, b) => {
      const numA = parseInt(a.key.split('-')[1], 10);
      const numB = parseInt(b.key.split('-')[1], 10);
      return numA - numB;
    });

    const tabla = new Table({
      head: ['Key', 'Título', 'Descripción', 'Asignado a', 'Estado', 'Epic Key', 'Epic Nombre'],
      colWidths: [10, 30, 40, 25, 15, 12, 30],
      wordWrap: true,
    });

    for (const issue of tareas) {
      const key = issue.key;
      const summary = issue.fields.summary || 'Sin título';
      const description = extraerTextoPlanoDesdeADF(issue.fields.description);
      const status = issue.fields.status?.name || 'Sin estado';

      const assignee = issue.fields.assignee
        ? issue.fields.assignee.displayName
        : 'Sin asignado';

      let epicKey = 'N/A';
      let epicName = 'Sin epic';

      if (issue.fields.parent) {
        epicKey = issue.fields.parent.key;
        epicName = issue.fields.parent.fields.summary;
      } else if (issue.fields[EPIC_LINK_FIELD]) {
        epicKey = issue.fields[EPIC_LINK_FIELD];
        epicName = await obtenerNombreEpic(epicKey);
      }

      tabla.push([key, summary, description, assignee, status, epicKey, epicName]);
    }

    console.log(tabla.toString());
  } catch (error) {
    console.error('❌ Error al obtener las tareas:', error.response?.data || error.message);
  }
}

async function obtenerEpics() {
  try {
    const jql = `project=${encodeURIComponent(JIRA_PROJECT_KEY)} AND issuetype=Epic`;
    const epicsRes = await axios.get(`${JIRA_URL}/rest/api/3/search?jql=${jql}`, { auth });
    const epics = epicsRes.data.issues;

    const tabla = new Table({
      head: ['Key', 'Título'],
      colWidths: [10, 50],
      wordWrap: true,
    });

    for (const epic of epics) {
      const key = epic.key;
      const summary = epic.fields.summary || 'Sin título';
      tabla.push([key, summary]);
    }

    console.log('\n=== EPICS ===');
    console.log(tabla.toString());
  } catch (error) {
    console.error('❌ Error al obtener los epics:', error.response?.data || error.message);
  }
}

(async () => {
  console.log(`🔎 Listando issues para proyecto: ${JIRA_PROJECT_KEY}\n`);
  await obtenerTareas();
  await obtenerEpics();
})();
