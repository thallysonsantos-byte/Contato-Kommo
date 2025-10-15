const express = require('express');
const axios = require = require('axios'); // Garante que axios está sendo importado corretamente

const app = express();
const PORT = 3002; // Ou 3002, se você mudou na última etapa!

// Middleware para analisar corpos de requisição JSON
app.use(express.json());

// --- Configurações da API Externa (Kommo/amoCRM) ---
const KOMMO_API_URL_CONTACTS = 'https://iborges.kommo.com/api/v4/contacts';
const KOMMO_API_URL_LEADS = 'https://iborges.kommo.com/api/v4/leads';

// ATENÇÃO: Em um ambiente de produção, este token DEVE ser armazenado em variáveis de ambiente
const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Ijk3MTEzMzkyYjNjYzc0NmZlZWU0NmQ0NTRlYWZiYWFjNDk1NTRhMGI4MzI2Y2IxMWEyOTk2YzRiOTQ2OWZhNTNlMDI0M2JlMzBmYWVjMTIzIn0.eyJhdWQiOiJmM2YyYWRmMS00YWE5LTQwZmItYmMzNC0zMWNmNWYxZTQ5NTYiLCJqdGkiOiI5NzExMzM5MmIzY2M3NDZmZWVlNDZkNDU0ZWFmYmFhYzQ5NTU0YTBiODMyNmNiMTFhMjk5NmM0Yjk0NjlmYTUzZTAyNDNiZTMwZmFlYzEyMyIsImlhdCI6MTc2MDQ2NDQzNCwibmJmIjoxNzYwNDY0NDM0LCJleHAiOjE4MzAyOTc2MDAsInN1YiI6IjE0MDI2OTExIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM1MzcyODM2LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwidXNlcl9mbGFncyI6MCwiaGFzaF91dWlkIjoiZjhlZjg0ODktNjlkOC00ZDZmLThlY2UtNDUxY2JlYTczOWIzIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.rz-xAf86xU17U2zG6OjhIMLv6I8AcAGmKN7EuqBz-efL4tWEbVEOBpty58tE8yHe1WTaY3I3sG_fVvKBSvQ4oxP-mVLzfzddW0TJnupEvKEMq9vgODrR5DmHaYSUAyTm_dmJDQzDxpU13ySeEYZRo5PqvMfmm5bElwgGjHUVwMsVO8JyUb4j6D6huc9EbqpLb3QXPXUPJ2U_bdWk4vDJe1nxCAdoUPEQmv_tWya0BdSep9ov3XGnoJgH3KcAGm1OJxMgsVrUVe1xjVBMqa62Y8-ahu5ZRnuwWYi5QZGFDSojBB0kOMKTgJfrYGGjfQj_cEtjzcE-0xzee5tn2ut1IA';

// --- ROTAS DO PROXY ---

// [ROTA 1] Criar Contato (Rota anterior)
app.post('/create-contact-proxy', async (req, res) => {
    // ... Código da rota anterior (Criar Contato) ...
    const requestBody = req.body;

    try {
        const responseKommo = await axios.post(KOMMO_API_URL_CONTACTS, requestBody, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'API Proxy Node.js'
            }
        });

        const data = responseKommo.data;

        if (data && data._embedded && data._embedded.contacts) {
            const contactIDs = data._embedded.contacts.map(contact => contact.id);

            return res.status(200).json({
                success: true,
                contact_ids: contactIDs
            });

        } else {
            return res.status(500).json({ 
                success: false, 
                message: 'Resposta da API externa inesperada',
                original_data: data
            });
        }

    } catch (error) {
        console.error('Erro ao chamar a API Kommo (Contatos):', error.response ? error.response.data : error.message);
        
        const status = error.response ? error.response.status : 500;
        const errorMessage = error.response && error.response.data 
            ? error.response.data 
            : 'Erro interno ao processar a requisição.';

        return res.status(status).json({
            success: false,
            message: 'Falha na comunicação ou autenticação com a API externa.',
            details: errorMessage
        });
    }
});


// [ROTA 2] Criar Lead (Nova Rota)
app.post('/create-lead-proxy', async (req, res) => {
    
    // --- 1. RECEBER VARIÁVEIS DO CLIENTE ---
    const { 
        name, 
        price, // Se o cliente passar o preço, use-o
        contact_id // ID do contato a ser vinculado
    } = req.body; 

    // Validação básica
    if (!name || !contact_id) {
        return res.status(400).json({
            success: false,
            message: "Os campos 'name' e 'contact_id' são obrigatórios no body."
        });
    }

    // --- 2. MONTAR O PAYLOAD COM VALORES FIXOS E VARIÁVEIS ---

    // Valores fixos da Kommo/amoCRM
    const FIXED_PIPELINE_ID = 12205980;
    const FIXED_STATUS_ID = 94307160;
    const FIXED_RESPONSIBLE_USER_ID = 0; // Se 0 é "Não atribuído", se for um usuário específico, mude o ID.

    // Payload que será enviado para a API Kommo/amoCRM
    const kommoPayload = [
        {
            "name": name, // Variável do cliente
            "price": price || 0, // Variável do cliente, default 0 se não for fornecido
            "pipeline_id": FIXED_PIPELINE_ID, // Fixo
            "status_id": FIXED_STATUS_ID, // Fixo
            "responsible_user_id": FIXED_RESPONSIBLE_USER_ID, // Fixo
            "_embedded": {
                "contacts": [
                    {
                        "id": contact_id // Variável do cliente (ID do contato)
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
                'User-Agent': 'API Proxy Node.js'
            }
        });

        const data = responseKommo.data;

        // --- 4. FILTRAR A RESPOSTA (Retornar IDs dos Leads) ---
        if (data && data._embedded && data._embedded.leads) {
            
            const leadIDs = data._embedded.leads.map(lead => lead.id);

            // --- 5. RETORNAR RESPOSTA FILTRADA ---
            return res.status(200).json({
                success: true,
                lead_ids: leadIDs
            });

        } else {
            return res.status(500).json({ 
                success: false, 
                message: 'Resposta da API externa inesperada',
                original_data: data
            });
        }

    } catch (error) {
        // --- 6. TRATAMENTO DE ERROS ---
        console.error('Erro ao chamar a API Kommo (Leads):', error.response ? error.response.data : error.message);
        
        const status = error.response ? error.response.status : 500;
        const errorMessage = error.response && error.response.data 
            ? error.response.data 
            : 'Erro interno ao processar a requisição.';

        return res.status(status).json({
            success: false,
            message: 'Falha na comunicação ou autenticação com a API externa.',
            details: errorMessage
        });
    }
});


app.listen(PORT, () => {
    console.log(`API Proxy rodando em http://localhost:${PORT}`);
    console.log(`Endpoint Contatos: POST http://localhost:${PORT}/create-contact-proxy`);
    console.log(`Endpoint Leads: POST http://localhost:${PORT}/create-lead-proxy`);
});