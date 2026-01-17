
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
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
    
    if (res.ok) {
      const data = await res.json();
      
      if (data.location && data.location.coordinates) {
        const lat = parseFloat(data.location.coordinates.latitude);
        const lng = parseFloat(data.location.coordinates.longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            lat,
            lng,
            address: `${data.street || 'Logradouro não informado'}, ${data.neighborhood || 'Bairro não informado'}, ${data.city} - ${data.state}`,
            city: data.city
          };
        }
      }
      return await fallbackGeocoding(data.street, data.neighborhood, data.city, data.state, cleanCep);
    }
    
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const viaData = await viaCepRes.json();
    if (viaData.erro) throw new Error("CEP não encontrado.");
    
    return await fallbackGeocoding(viaData.logradouro, viaData.bairro, viaData.localidade, viaData.uf, cleanCep);

  } catch (err: any) {
    console.error("GeoService Error:", err);
    throw new Error(err.message || "Não foi possível localizar este CEP.");
  }
};

async function fallbackGeocoding(street: string, neighborhood: string, city: string, state: string, cep: string): Promise<GeoLocation> {
  const baseUrl = "https://nominatim.openstreetmap.org/search";
  const query = `${street || ''} ${neighborhood || ''} ${city} ${state} Brasil`.trim();
  
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '1',
    'accept-language': 'pt-BR'
  });

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  const data = await res.json();

  if (data && data.length > 0) {
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        lat,
        lng,
        address: `${street || 'Área s/ logradouro'}, ${neighborhood || 'Bairro'}, ${city} - ${state}`,
        city: city
      };
    }
  }

  const cityQuery = `${city}, ${state}, Brasil`;
  const cityRes = await fetch(`${baseUrl}?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`);
  const cityData = await cityRes.json();

  if (cityData && cityData.length > 0) {
    const lat = parseFloat(cityData[0].lat);
    const lng = parseFloat(cityData[0].lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        lat,
        lng,
        address: `${street || 'Rua não localizada'}, ${city} - ${state}`,
        city: city
      };
    }
  }

  throw new Error("Endereço validado, mas não conseguimos gerar as coordenadas exatas.");
}
