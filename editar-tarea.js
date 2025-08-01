const axios = require('axios');

const JIRA_URL = '';
const JIRA_EMAIL = '';
const JIRA_TOKEN = '';
const STORY_POINTS_FIELD = 'customfield_10016';

const issueKey = process.argv[2];
const nuevoTitulo = process.argv[3];
const nuevaDescripcion = process.argv[4];
const storyPoints = process.argv[5] ? Number(process.argv[5]) : null;
const epicKey = process.argv[6] || null;
const assigneeEmail = process.argv[7] || null;

if (!issueKey || !nuevoTitulo || !nuevaDescripcion) {
  console.error('❌ Debes ingresar: node editar-tarea.js <issueKey> <nuevoTitulo> <nuevaDescripcion> [storyPoints] [epicKey] [assigneeEmail]');
  process.exit(1);
}

const descripcionADF = {
  type: 'doc',
  version: 1,
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: nuevaDescripcion }
      ]
    }
  ]
};

const TRANSITIONS = {
  'pendiente': '11',
  'en curso': '21',
  'finalizado': '31'
};

async function editarTarea() {
  try {
    const campos = {
      summary: nuevoTitulo,
      description: descripcionADF,
    };

    if (storyPoints !== null && !isNaN(storyPoints)) {
      campos[STORY_POINTS_FIELD] = storyPoints;
    }

    if (epicKey) {
      campos.parent = { key: epicKey };
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

    await axios.put(
      `${JIRA_URL}/rest/api/3/issue/${issueKey}`,
      { fields: campos },
      {
        auth: { username: JIRA_EMAIL, password: JIRA_TOKEN },
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      }
    );

    console.log(`✅ Tarea ${issueKey} actualizada con éxito.`);

    // Cambiar estado si descripción contiene palabra clave
    const descLower = nuevaDescripcion.toLowerCase();
    for (const estado of Object.keys(TRANSITIONS)) {
      if (descLower.includes(estado)) {
        const transitionId = TRANSITIONS[estado];
        await axios.post(
          `${JIRA_URL}/rest/api/3/issue/${issueKey}/transitions`,
          { transition: { id: transitionId } },
          {
            auth: { username: JIRA_EMAIL, password: JIRA_TOKEN },
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
          }
        );
        console.log(`✅ Estado cambiado a "${estado}".`);
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error al editar la tarea:', error.response?.data || error.message);
  }
}

editarTarea();
