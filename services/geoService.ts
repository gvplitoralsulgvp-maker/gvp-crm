
export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

export const getCoordsFromCep = async (cep: string): Promise<GeoLocation> => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) throw new Error("O CEP deve conter 8 números.");

  // 1. Busca endereço no ViaCEP
  const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  if (!viaCepRes.ok) throw new Error("Erro de conexão com o serviço de CEP.");
  
  const addressData = await viaCepRes.json();
  if (addressData.erro) throw new Error("CEP não encontrado na base de dados dos Correios.");

  // 2. Construção inteligente da string de busca para o Nominatim
  // Filtramos apenas partes que não são vazias
  const searchParts = [];
  if (addressData.logradouro) searchParts.push(addressData.logradouro);
  if (addressData.localidade) searchParts.push(addressData.localidade);
  if (addressData.uf) searchParts.push(addressData.uf);
  searchParts.push("Brasil");
  
  const fullSearchQuery = searchParts.join(', ');

  try {
    // 3. Geocodificação no Nominatim (OpenStreetMap)
    const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullSearchQuery)}&limit=1`);
    const geoData = await nominatimRes.json();

    if (geoData && geoData.length > 0) {
      return {
        lat: parseFloat(geoData[0].lat),
        lng: parseFloat(geoData[0].lon),
        address: `${addressData.logradouro || 'Área sem logradouro'}, ${addressData.bairro || ''}, ${addressData.localidade} - ${addressData.uf}`,
        city: addressData.localidade
      };
    }

    // 4. Fallback: Se falhou com a rua, tenta apenas Cidade + Estado + Brasil
    const fallbackQuery = `${addressData.localidade}, ${addressData.uf}, Brasil`;
    const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1`);
    const fallbackData = await fallbackRes.json();

    if (fallbackData && fallbackData.length > 0) {
      return {
        lat: parseFloat(fallbackData[0].lat),
        lng: parseFloat(fallbackData[0].lon),
        address: `Aprox: ${addressData.bairro || 'Centro'}, ${addressData.localidade} - ${addressData.uf}`,
        city: addressData.localidade
      };
    }

    throw new Error("Endereço validado, mas não foi possível marcar no mapa. Tente um CEP próximo ou ajuste manualmente no Admin.");
  } catch (err: any) {
    if (err.message.includes("Endereço validado")) throw err;
    throw new Error("Falha ao conectar com o serviço de mapas. Verifique sua internet.");
  }
};
