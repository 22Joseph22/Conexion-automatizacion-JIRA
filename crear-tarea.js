const axios = require('axios');

const JIRA_URL = '';
const JIRA_EMAIL = '';
const JIRA_TOKEN = '';
const PROJECT_KEY = '';
const SPRINT_ID = 2;
const STORY_POINTS_FIELD = 'customfield_10016'; // Asegúrate de que este sea el correcto

// Argumentos
const titulo = process.argv[2] || 'Tarea de prueba';
const epicKey = process.argv[3] || null;           // Ejemplo: "JIRA-4"
const descripcionTextoPlano = process.argv[4] || 'Descripción por defecto';
const assigneeEmail = process.argv[5] || null;     // correo para asignar
const storyPoints = process.argv[6] ? Number(process.argv[6]) : null;  // Número

// Descripción en formato ADF
const descripcionADF = {
  type: "doc",
  version: 1,
  content: [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: descripcionTextoPlano
        }
      ]
    }
  ]
};

async function crearTarea() {
  try {
    const campos = {
      project: { key: PROJECT_KEY },
      summary: titulo,
      description: descripcionADF,
      issuetype: { name: "Tarea" }
    };

    if (epicKey) {
      campos.parent = { key: epicKey };
    }

    if (storyPoints !== null && !isNaN(storyPoints)) {
      campos[STORY_POINTS_FIELD] = storyPoints;
    }

    if (assigneeEmail) {
      const userRes = await axios.get(`${JIRA_URL}/rest/api/3/user/search`, {
        params: { query: assigneeEmail },
        auth: { username: JIRA_EMAIL, password: JIRA_TOKEN }
      });

      if (userRes.data.length > 0) {
        campos.assignee = { accountId: userRes.data[0].accountId };
      } else {
        console.warn(`⚠️ Usuario con correo ${assigneeEmail} no encontrado. No se asignará la tarea.`);
      }
    }

    const res = await axios.post(
      `${JIRA_URL}/rest/api/3/issue`,
      { fields: campos },
      {
        auth: { username: JIRA_EMAIL, password: JIRA_TOKEN },
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      }
    );

    const issueKey = res.data.key;
    console.log(`✅ Tarea creada con clave: ${issueKey}`);

    if (SPRINT_ID) {
      await axios.post(
        `${JIRA_URL}/rest/agile/1.0/sprint/${SPRINT_ID}/issue`,
        { issues: [issueKey] },
        {
          auth: { username: JIRA_EMAIL, password: JIRA_TOKEN },
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        }
      );
      console.log(`✅ Tarea ${issueKey} agregada al sprint ${SPRINT_ID}`);
    }
  } catch (error) {
    console.error('❌ Error creando tarea o agregándola al sprint:', error.response?.data || error.message);
  }
}

crearTarea();
