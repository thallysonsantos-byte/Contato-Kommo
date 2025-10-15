const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3002;

// Middleware para analisar corpos de requisição JSON
app.use(express.json());

// --- Configurações da API Externa (Kommo/amoCRM) ---
const KOMMO_API_URL = 'https://iborges.kommo.com/api/v4/contacts';
// ATENÇÃO: Em um ambiente de produção, este token DEVE ser armazenado em variáveis de ambiente
// ou em um sistema de gerenciamento de segredos, NUNCA hardcoded no código.
const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Ijk3MTEzMzkyYjNjYzc0NmZlZWU0NmQ0NTRlYWZiYWFjNDk1NTRhMGI4MzI2Y2IxMWEyOTk2YzRiOTQ2OWZhNTNlMDI0M2JlMzBmYWVjMTIzIn0.eyJhdWQiOiJmM2YyYWRmMS00YWE5LTQwZmItYmMzNC0zMWNmNWYxZTQ5NTYiLCJqdGkiOiI5NzExMzM5MmIzY2M3NDZmZWVlNDZkNDU0ZWFmYmFhYzQ5NTU0YTBiODMyNmNiMTFhMjk5NmM0Yjk0NjlmYTUzZTAyNDNiZTMwZmFlYzEyMyIsImlhdCI6MTc2MDQ2NDQzNCwibmJmIjoxNzYwNDY0NDM0LCJleHAiOjE4MzAyOTc2MDAsInN1YiI6IjE0MDI2OTExIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjM1MzcyODM2LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwidXNlcl9mbGFncyI6MCwiaGFzaF91dWlkIjoiZjhlZjg0ODktNjlkOC00ZDZmLThlY2UtNDUxY2JlYTczOWIzIiwiYXBpX2RvbWFpbiI6ImFwaS1jLmtvbW1vLmNvbSJ9.rz-xAf86xU17U2zG6OjhIMLv6I8AcAGmKN7EuqBz-efL4tWEbVEOBpty58tE8yHe1WTaY3I3sG_fVvKBSvQ4oxP-mVLzfzddW0TJnupEvKEMq9vgODrR5DmHaYSUAyTm_dmJDQzDxpU13ySeEYZRo5PqvMfmm5bElwgGjHUVwMsVO8JyUb4j6D6huc9EbqpLb3QXPXUPJ2U_bdWk4vDJe1nxCAdoUPEQmv_tWya0BdSep9ov3XGnoJgH3KcAGm1OJxMgsVrUVe1xjVBMqa62Y8-ahu5ZRnuwWYi5QZGFDSojBB0kOMKTgJfrYGGjfQj_cEtjzcE-0xzee5tn2ut1IA';

// --- Rota da sua API Proxy ---
app.post('/create-contact-proxy', async (req, res) => {
    // O Body da requisição do cliente é o body para a API externa
    const requestBody = req.body;

    try {
        // 1. Configurar e chamar a API externa
        const responseKommo = await axios.post(KOMMO_API_URL, requestBody, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'API Proxy Node.js' // Boa prática
            }
        });

        const data = responseKommo.data;

        // 2. Mapear e Filtrar a Resposta
        // A resposta esperada tem a estrutura data._embedded.contacts
        if (data && data._embedded && data._embedded.contacts) {
            
            // Usamos o método .map() para iterar sobre o array de contatos
            // e extrair APENAS o campo 'id' de cada contato.
            const contactIDs = data._embedded.contacts.map(contact => contact.id);

            // 3. Retornar a Resposta Específica e Filtrada
            // Retorna um array de IDs. Ex: [27229112, 27229113]
            return res.status(200).json({
                success: true,
                contact_ids: contactIDs
            });

        } else {
            // Caso a API retorne 200, mas com um formato de dados inesperado
            return res.status(500).json({ 
                success: false, 
                message: 'Resposta da API externa inesperada',
                original_data: data
            });
        }

    } catch (error) {
        // 4. Tratamento de Erros
        console.error('Erro ao chamar a API Kommo:', error.response ? error.response.data : error.message);
        
        // Retorna um erro amigável para o cliente,
        // mas tenta incluir detalhes do erro da API externa, se disponíveis.
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
    console.log(`Endpoint: POST http://localhost:${PORT}/create-contact-proxy`);
});