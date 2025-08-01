const axios = require('axios');
const Table = require('cli-table3');

const JIRA_URL = '';
const JIRA_EMAIL = '';
const JIRA_TOKEN = '';

const auth = {
  username: JIRA_EMAIL,
  password: JIRA_TOKEN
};

const EPIC_LINK_FIELD = 'customfield_10014';

async function obtenerNombreEpic(epicKey) {
  try {
    const response = await axios.get(`${JIRA_URL}/rest/api/3/issue/${epicKey}`, { auth });
    return response.data.fields.summary;
  } catch (error) {
    return 'Nombre de epic no encontrado';
  }
}

async function obtenerTareas() {
  try {
    const tareasRes = await axios.get(`${JIRA_URL}/rest/api/3/search?jql=project=JIRA AND issuetype != Epic`, { auth });
    let tareas = tareasRes.data.issues;

    // Ordenar tareas por número en la clave (ej: JIRA-3, JIRA-17)
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
      const summary = issue.fields.summary;
      const description = issue.fields.description?.content?.[0]?.content?.[0]?.text || 'Sin descripción';
      const status = issue.fields.status.name;

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
    const epicsRes = await axios.get(`${JIRA_URL}/rest/api/3/search?jql=project=JIRA AND issuetype=Epic`, { auth });
    const epics = epicsRes.data.issues;

    const tabla = new Table({
      head: ['Key', 'Título'],
      colWidths: [10, 50],
      wordWrap: true,
    });

    for (const epic of epics) {
      const key = epic.key;
      const summary = epic.fields.summary;
      tabla.push([key, summary]);
    }

    console.log('\n=== EPICS ===');
    console.log(tabla.toString());
  } catch (error) {
    console.error('❌ Error al obtener los epics:', error.response?.data || error.message);
  }
}

(async () => {
  await obtenerTareas();
  await obtenerEpics();
})();
