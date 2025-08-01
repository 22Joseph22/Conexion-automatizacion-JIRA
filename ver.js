const axios = require('axios');
const Table = require('cli-table3');

// 🔐 Configuración básica
const JIRA_URL = 'https://espoch-team-jz6cr4at.atlassian.net';
const JIRA_EMAIL = 'ferni.ajila@espoch.edu.ec';
const JIRA_TOKEN = 'ATATT3xFfGF00juwfUHSDocq76F3U7Fv_JsNbSPs3dbrvV809bccjRjoiH5w0DYrWMmOtMs-aOZIXAj94GGud3gFwiC5QXD3sGxn4QgdKIpJMk-NS7YrXG_Dtjn9xCCNvRc6f1O0gYUNcJ1cFncin9Vcoslbj_uygWnBg_F_4x0C5jJ3Phga1RY=15AA3879';

// ✅ Aquí defines la clave del proyecto (modifícalo cuando quieras)
const JIRA_PROJECT_KEY = 'GIT'; // ← Cambia esto si tu proyecto usa otra clave

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
    const jql = `project=${JIRA_PROJECT_KEY} AND issuetype != Epic`;
    const tareasRes = await axios.get(`${JIRA_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}`, { auth });
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
    const jql = `project=${JIRA_PROJECT_KEY} AND issuetype=Epic`;
    const epicsRes = await axios.get(`${JIRA_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}`, { auth });
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
