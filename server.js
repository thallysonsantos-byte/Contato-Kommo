const express = require('express');
const axios = require('axios');

const app = express();
// Defina a porta que você abriu no firewall da OCI (ex: 3000 ou 3002)
const PORT = 3002; 

// Middleware para analisar corpos de requisição JSON
app.use(express.json());

// --- Configurações da API Externa (Kommo/amoCRM) ---
const KOMMO_API_URL_CONTACTS = 'https://iborges.kommo.com/api/v4/contacts';
const KOMMO_API_URL_LEADS = 'https://iborges.kommo.com/api/v4/leads';

// ATENÇÃO: Este token está hardcoded APENAS para demonstração.
// EM PRODUÇÃO, use variáveis de ambiente (.env) para segurança.
const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Ijk3MTEzMzkyYjNjYzc0NmZlZWU0NmQ0NTRlYWZiYWFjNDk1NTRhMGI4MzI2Y2IxMWEyOTk2YzRiOTQ2OWZhNTNlMDI0M2JlMzBmYWVjMTIzIn0.eyJhdWQiOiJmM2YyYWRmMS00YWE5LTQwZmItYmMzNC0zMWNmNWYxZTQ5NTYiLCJqdGkiOiI5NzExMzM5MmIzY2M3NDZmZWVlNDZkNDU0ZWFmYmFhYzQ5NTU0YTBiODMyNmNiMTFhMjk5NmM0Yjk0NjlmYTUzZTAyNDNiZTMwZmFlYzEyMyIsImlhdCI6MTc2MDQ2NDQzNCwibmJmIjoxNzYwNDY0NDM0LCJleHAiOjE4MzAyOTc2MDAsInN1YiI6IjE0MDI2OTExIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM1MzcyODM2LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwidXNlcl9mbGFncyI6MCwiaGFzaF91dWlkIjoiZjhlZjg0ODktNjlkOC00ZDZmLThlY2UtNDUxY2JlYTczOWIzIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.rz-xAf86xU17U2zG6OjhIMLv6I8AcAGmKN7EuqBz-efL4tWEbVEOBpty58tE8yHe1WTaY3I3sG_fVvKBSvQ4oxP-mVLzfzddW0TJnupEvKEMq9vgODrR5DmHaYSUAyTm_dmJDQzDxpU13ySeEYZRo5PqvMfmm5bElwgGjHUVwMsVO8JyUb4j6D6huc9EbqpLb3QXPXUPJ2U_bdWk4vDJe1nxCAdoUPEQmv_tWya0BdSep9ov3XGnoJgH3KcAGm1OJxMgsVrUVe1xjVBMqa62Y8-ahu5ZRnuwWYi5QZGFDSojBB0kOMKTgJfrYGGjfQj_cEtjzcE-0xzee5tn2ut1IA';

// --- FUNÇÃO AUXILIAR PARA TRATAMENTO DE ERROS ---
const handleError = (error, res, entityName) => {
    console.error(`Erro ao chamar a API Kommo (${entityName}):`, error.response ? error.response.data : error.message);
    
    const status = error.response ? error.response.status : 500;
    const errorMessage = error.response && error.response.data 
        ? error.response.data 
        : 'Erro interno ao processar a requisição.';

    return res.status(status).json({
        success: false,
        message: `Falha na comunicação ou autenticação com a API externa (${entityName}).`,
        details: errorMessage
    });
};

// --- [ROTA 1] CRIAR CONTATO ---
// Endpoint: POST /create-contact-proxy
// Retorno: Array de IDs de Contatos (Numbers)
app.post('/create-contact-proxy', async (req, res) => {
    const requestBody = req.body;

    try {
        const responseKommo = await axios.post(KOMMO_API_URL_CONTACTS, requestBody, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'API Proxy Node.js (Contacts)'
            }
        });

        const data = responseKommo.data;

        if (data && data._embedded && data._embedded.contacts) {
            // Filtra e retorna APENAS os IDs dos contatos criados
            const contactIDs = data._embedded.contacts.map(contact => contact.id);

            return res.status(200).json({
                success: true,
                contact_ids: contactIDs
            });

        } else {
            return res.status(500).json({ 
                success: false, 
                message: 'Resposta da API externa inesperada (Contatos)',
                original_data: data
            });
        }

    } catch (error) {
        return handleError(error, res, 'Contatos');
    }
});


// --- [ROTA 2] CRIAR LEAD (NEGÓCIO) ---
// Endpoint: POST /create-lead-proxy
// Retorno: Array de IDs de Leads (Numbers)
app.post('/create-lead-proxy', async (req, res) => {
    
    // --- 1. RECEBER VARIÁVEIS DO CLIENTE ---
    const { 
        name, 
        price,
        contact_id 
    } = req.body; 

    // Validação básica
    if (!name || !contact_id) {
        return res.status(400).json({
            success: false,
            message: "Os campos 'name' e 'contact_id' são obrigatórios no body."
        });
    }

    // Garante que o ID do contato é um número inteiro (Correção para o erro 400 de validação)
    const contactIdAsNumber = parseInt(contact_id, 10);

    if (isNaN(contactIdAsNumber) || contactIdAsNumber <= 0) {
        return res.status(400).json({
            success: false,
            message: "O 'contact_id' fornecido é inválido ou não é um número inteiro válido."
        });
    }

    // --- 2. MONTAR O PAYLOAD COM VALORES FIXOS E VARIÁVEIS ---

    // Valores fixos
    const FIXED_PIPELINE_ID = 12205980;
    const FIXED_STATUS_ID = 94307160;
    const FIXED_RESPONSIBLE_USER_ID = 0; // 0 geralmente significa "Não atribuído"

    const kommoPayload = [
        {
            "name": name, 
            "price": price || 0, // Usa o preço do cliente, default 0
            "pipeline_id": FIXED_PIPELINE_ID, 
            "status_id": FIXED_STATUS_ID, 
            "responsible_user_id": FIXED_RESPONSIBLE_USER_ID, 
            "_embedded": {
                "contacts": [
                    {
                        "id": contactIdAsNumber // Usando o ID validado e como número
                    }
                ]
            }
        }
    ];

    try {
        // --- 3. CHAMAR A API EXTERNA ---
        const responseKommo = await axios.post(KOMMO_API_URL_LEADS, kommoPayload, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'API Proxy Node.js (Leads)'
            }
        });

        const data = responseKommo.data;

        // --- 4. FILTRAR A RESPOSTA (Retornar IDs dos Leads) ---
        if (data && data._embedded && data._embedded.leads) {
            
            const leadIDs = data._embedded.leads.map(lead => lead.id);

            return res.status(200).json({
                success: true,
                lead_ids: leadIDs
            });

        } else {
            return res.status(500).json({ 
                success: false, 
                message: 'Resposta da API externa inesperada (Leads)',
                original_data: data
            });
        }

    } catch (error) {
        return handleError(error, res, 'Leads');
    }
});


app.listen(PORT, () => {
    console.log(`\n--- Servidor Proxy Kommo Iniciado ---`);
    console.log(`API rodando em http://localhost:${PORT}`);
    console.log(`Endpoint Contatos: POST /create-contact-proxy`);
    console.log(`Endpoint Leads: POST /create-lead-proxy`);
    console.log('-------------------------------------\n');
});