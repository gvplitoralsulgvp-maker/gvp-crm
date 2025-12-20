
export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

/**
 * Obtém coordenadas geográficas a partir de um CEP brasileiro.
 * Utiliza BrasilAPI v2 (preferencial) ou fallback Nominatim.
 */
export const getCoordsFromCep = async (cep: string): Promise<GeoLocation> => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) throw new Error("O CEP deve conter exatamente 8 números.");

  try {
    // 1. Tenta BrasilAPI v2 (Retorna coordenadas diretamente em muitos casos)
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
    
    if (res.ok) {
      const data = await res.json();
      
      // Se a BrasilAPI já retornou as coordenadas
      if (data.location && data.location.coordinates) {
        const { longitude, latitude } = data.location.coordinates;
        return {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
          address: `${data.street || 'Logradouro não informado'}, ${data.neighborhood || 'Bairro não informado'}, ${data.city} - ${data.state}`,
          city: data.city
        };
      }
      
      // Se não retornou coordenadas, mas retornou endereço, tentamos Nominatim como fallback
      return await fallbackGeocoding(data.street, data.neighborhood, data.city, data.state, cleanCep);
    }
    
    // 2. Se BrasilAPI falhar, tenta ViaCEP + Nominatim como última instância
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const viaData = await viaCepRes.json();
    
    if (viaData.erro) throw new Error("CEP não encontrado.");
    
    return await fallbackGeocoding(viaData.logradouro, viaData.bairro, viaData.localidade, viaData.uf, cleanCep);

  } catch (err: any) {
    console.error("GeoService Error:", err);
    if (err.message === 'Failed to fetch') {
      throw new Error("Erro de conexão. Verifique sua internet ou tente novamente em instantes.");
    }
    throw new Error(err.message || "Não foi possível localizar este CEP.");
  }
};

/**
 * Fallback para transformar endereço em coordenadas via Nominatim
 */
async function fallbackGeocoding(street: string, neighborhood: string, city: string, state: string, cep: string): Promise<GeoLocation> {
  const baseUrl = "https://nominatim.openstreetmap.org/search";
  const query = `${street}, ${neighborhood}, ${city}, ${state}, Brasil`;
  
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '1',
    'accept-language': 'pt-BR',
    email: 'gvp-app@gvp-litoral.com'
  });

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();

  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      address: `${street || 'Área s/ logradouro'}, ${neighborhood || 'Centro'}, ${city} - ${state}`,
      city: city
    };
  }

  // Fallback para o centro da cidade se a rua falhar
  const cityQuery = `${city}, ${state}, Brasil`;
  const cityRes = await fetch(`${baseUrl}?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`);
  const cityData = await cityRes.json();

  if (cityData && cityData.length > 0) {
    return {
      lat: parseFloat(cityData[0].lat),
      lng: parseFloat(cityData[0].lon),
      address: `${street || 'Rua não localizada'}, ${city} - ${state}`,
      city: city
    };
  }

  throw new Error("Endereço validado, mas não conseguimos gerar o ponto no mapa.");
}
