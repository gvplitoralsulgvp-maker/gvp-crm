
import { AppState, Member, VisitSlot, Patient, LogEntry, Notification, Hospital, VisitRoute, SocialWorkerVisit, UserRole } from '../types';
import { supabase } from './supabaseClient';

/** 
 * GVP STORAGE SERVICE - V11
 * Responsável pela persistência e carregamento do estado global via Supabase.
 * Contém a lista consolidada de membros extraída do documento oficial GVP Litoral Sul.
 */

export const createDefaultState = (): AppState => ({
  currentUser: null,
  members: [
    { id: 'm1', name: 'Francisco Chagas', email: 'francisco.chagas@gvp.com', phone: '11 95772-3539', role: UserRole.MEMBER, active: true },
    { id: 'm2', name: 'Abel Farias', email: 'abel.farias@gvp.com', phone: '13 99666-1025', role: UserRole.MEMBER, active: true },
    { id: 'm3', name: 'Celso Xavier', email: 'celso.xavier@gvp.com', phone: '13 98146-6179', role: UserRole.MEMBER, active: true },
    { id: 'm4', name: 'Felipe Reis', email: 'felipe.reis@gvp.com', phone: '13 98128-7457', role: UserRole.MEMBER, active: true, congregation: 'Itanhaem' },
    { id: 'm5', name: 'Thiago Pereira', email: 'thiago.pereira@gvp.com', phone: '13 99637-6933', role: UserRole.MEMBER, active: true },
    { id: 'm6', name: 'Tiago Alves de Andrade', email: 'tiago.andrade@gvp.com', phone: '13 99796-2076', role: UserRole.MEMBER, active: true },
    { id: 'm7', name: 'Wellington Gomes', email: 'wellington.gomes@gvp.com', phone: '13 99656-2195', role: UserRole.MEMBER, active: true, congregation: 'Itariri' },
    { id: 'm8', name: 'Ronevaldo Araújo Sobrinho', email: 'ronevaldo.araujo@gvp.com', phone: '13 99801-8956', role: UserRole.MEMBER, active: true },
    { id: 'm9', name: 'Jose Ribeiro de São Pedro', email: 'jose.pedro@gvp.com', phone: '13 99637-3388', role: UserRole.MEMBER, active: true },
    { id: 'm10', name: 'Zenivaldo Andrade Araujo', email: 'zenivaldo.araujo@gvp.com', phone: '15 99778-5415', role: UserRole.MEMBER, active: true },
    { id: 'm11', name: 'Rubens Rufino de Souza', email: 'rubens.souza@gvp.com', phone: '13 98170-0028', role: UserRole.MEMBER, active: true, congregation: 'Registro' },
    { id: 'm12', name: 'Renato Baldoino dos Reis', email: '4renatoReis@jwpub.org', phone: '11 98542-7381', role: UserRole.MEMBER, active: true },
    { id: 'm13', name: 'Luiz Antônio de Oliveira Pimentel', email: 'luiz.pimentel@gvp.com', phone: '13 97422-9367', role: UserRole.MEMBER, active: true },
    { id: 'm14', name: 'Valdirei Pereira de Souza', email: 'valdireis42@jwpub.org', phone: '11 96905-4837', role: UserRole.MEMBER, active: true, congregation: 'Iguape' },
    { id: 'm15', name: 'Cicero Oliveira', email: 'cicerod61@jwpub.org', phone: '11 96623-4492', role: UserRole.MEMBER, active: true, congregation: 'Peruibe' },
    { id: 'm16', name: 'Denis dos Santos Alves', email: 'denisalves14@jwpub.org', phone: '13 98148-6977', role: UserRole.MEMBER, active: true, congregation: 'Peruibe' },
    { id: 'm17', name: 'Fernando Tadeu Lanichek', email: 'ernandoM3@jwpub.org', phone: '13 99748-8394', role: UserRole.MEMBER, active: true, congregation: 'Itanhaem' },
    { id: 'm18', name: 'Thiago Zardo', email: 'ThiagoZardo49@jwpub.org', phone: '13 98877-0538', role: UserRole.MEMBER, active: true, congregation: 'Itanhaem' },
    { id: 'm19', name: 'Aparecido Francisco de Lima', email: '7AparecidoLima@jwpub.org', phone: '13 974227513', role: UserRole.MEMBER, active: true, congregation: 'Peruibe' },
    { id: 'm20', name: 'Marivan Sanches', email: 'marivans15@jwpub.org', phone: '13 988263341', role: UserRole.MEMBER, active: true, congregation: 'Miracatu' },
    { id: 'm21', name: 'João Amauri Pinto', email: 'Pjoao57@jwpub.org', phone: '13 99710-7914', role: UserRole.MEMBER, active: true, congregation: 'Ilha cumprida' },
    { id: 'm22', name: 'João Carvalho', email: '37sobrinhoJ@jwpub.org', phone: '11 987443989', role: UserRole.MEMBER, active: true, congregation: 'Sul de Ilha Cumprida' },
    { id: 'm23', name: 'Carlos Roberto Rosa Rocio', email: 'RCarlos27@jwpub.org', phone: '1399662-0543', role: UserRole.MEMBER, active: true, congregation: 'Iguape' },
    { id: 'm24', name: 'João Teixeira Prado', email: 'jprado11@jwpub.org', phone: '13 997870627', role: UserRole.MEMBER, active: true, congregation: 'Central Registro' },
    { id: 'm25', name: 'Orivaldo Costa', email: 'orivaldo@jwpub.org', phone: '13 99612-0781', role: UserRole.MEMBER, active: true, congregation: 'Central Registro' },
    { id: 'm26', name: 'Helio Baba', email: '5HelioBaba@jwpub.org', phone: '13 99711-0447', role: UserRole.MEMBER, active: true, congregation: 'Sul Regsitro' },
    { id: 'm27', name: 'Marcio Ribeiro', email: 'RibeiroMarcio@jwpub.org', phone: '13 98187-5349', role: UserRole.MEMBER, active: true, congregation: 'Sul de Registro' },
    { id: 'm28', name: 'Gilberto Costa', email: 'GRCG@jwpub.org', phone: '13 98187-5349', role: UserRole.MEMBER, active: true, congregation: 'Sul de Regsitro' },
    { id: 'm29', name: 'Osair Moura Gonzaga', email: 'omoura@jwpub.org', phone: '13 99635-6430', role: UserRole.MEMBER, active: true, congregation: 'Central Cajati' },
    { id: 'm30', name: 'Luiz Roberto Dignazzio', email: 'LuizRobertoDignazzio@jwpub.org', phone: '11 999757543', role: UserRole.MEMBER, active: true, congregation: 'Central Cajati' },
    { id: 'm31', name: 'Marcio Ferreira', email: 'mferreira@jwpub.org', phone: '11 96952-6211', role: UserRole.MEMBER, active: true, congregation: 'Belas Artes' },
    { id: 'm32', name: 'Joel Ribeiro', email: '47joeld@jwpub.org', phone: '13 99720-1966', role: UserRole.MEMBER, active: true, congregation: 'Chacara das Tamaras' },
    { id: 'm33', name: 'Jefeson Baptista', email: 'JJefson@jwpub.org', phone: '13 97408-5795', role: UserRole.MEMBER, active: true, congregation: 'Chacara das Tamaras' },
    { id: 'm34', name: 'Amauri Silva', email: '3damauri@jwpub.org', phone: '13 982183119', role: UserRole.MEMBER, active: true, congregation: 'Chacara das Tamaras' },
    { id: 'm35', name: 'Adelson Silva', email: 'daSilvaA5@jwpub.org', phone: '13 97411.4545', role: UserRole.MEMBER, active: true, congregation: 'Itariri' },
    { id: 'm36', name: 'Joaci Gomes Silva', email: 'SJoaci@jwpub.org', phone: '11 98315-0303', role: UserRole.MEMBER, active: true, congregation: 'Capitão Braz' },
    { id: 'm37', name: 'Helio Polito', email: '1heliop@jwpub.org', phone: '13 98837-1037', role: UserRole.MEMBER, active: true, congregation: 'Praia Grande' },
    { id: 'm38', name: 'Julio Cesar Queiroz de Medeiros', email: 'julioCesarMedeiros22@jwpub.org', phone: '13 99718-0445', role: UserRole.MEMBER, active: true },
    { id: 'm39', name: 'Luiz Carlos Vieira Junior', email: 'juniorl50@jwpub.org', phone: '13 99777-9446', role: UserRole.MEMBER, active: true },
    { id: 'm40', name: 'Laércio de Souza', email: 'laerciosouza2@jwpub.org', phone: '13 98208-7075', role: UserRole.MEMBER, active: true },
    { id: 'm41', name: 'Carlos Leandro Estrela Rodrigues', email: '10rodriguescarlos@jwpub.org', phone: '13 98166-0463', role: UserRole.MEMBER, active: true },
    { id: 'm42', name: 'Leonardo Manoel Fernandes', email: 'Leonardo@jwpub.org', phone: '13 98853-1892', role: UserRole.MEMBER, active: true },
    { id: 'm43', name: 'Leonardo Goes de Santana', email: '39lsantana@jwpub.org', phone: '13 98165-5190', role: UserRole.MEMBER, active: true },
    { id: 'm44', name: 'Luiz Cláudio Martins de Oliveira', email: '33LuizO@jwpub.org', phone: '13 99644-3282', role: UserRole.MEMBER, active: true },
    { id: 'm45', name: 'Mario Henrique dos Santos R3', email: 'MarioS12@jwpub.org', phone: '13 97813-4558', role: UserRole.MEMBER, active: true },
    { id: 'm46', name: 'Nelson de Jesus', email: '2NJESUS@JWPUB.ORG', phone: '13 99669-3125', role: UserRole.MEMBER, active: true },
    { id: 'm47', name: 'Jose Claudio de Novaes', email: 'deNovaesJose23@jwpub.org', phone: '13 98168-2487', role: UserRole.MEMBER, active: true, congregation: 'Praia Grande' },
    { id: 'm48', name: 'Renato Ferreira de Souza', email: 'SRenato13@jwpub.org', phone: '11 98963-1690', role: UserRole.MEMBER, active: true, congregation: 'Mongagua' },
    { id: 'm49', name: 'Ricardo Rio Mardonado', email: 'rmardonado@jwpub.org', phone: '13 99697-6672', role: UserRole.MEMBER, active: true, congregation: 'Tude Bastos' },
    { id: 'm50', name: 'Valdecir Chagas', email: 'ValdecirChagas16@jwpub.org', phone: '13 99671-8648', role: UserRole.MEMBER, active: true },
    { id: 'm51', name: 'Jaquis Antonio dos Santos', email: 'JASantos@jwpub.org', phone: '13 99787-7910', role: UserRole.MEMBER, active: true, congregation: 'São Vicente' },
    { id: 'm52', name: 'João Batista de Carvalho Junior', email: 'decarvalhojoao@jwpub.org', phone: '13 99614-9875', role: UserRole.MEMBER, active: true },
    { id: 'm53', name: 'Diogo Santos Ribeiro', email: 'DiogoR@jwpub.org', phone: '13 99165-1771', role: UserRole.MEMBER, active: true, congregation: 'Tupiry' },
    { id: 'm54', name: 'Bartolomeu dos Reis', email: 'BartolomeuR@jwpub.org', phone: '13 99134-0431', role: UserRole.MEMBER, active: true },
    { id: 'm55', name: 'Michael Moraes dos Santos', email: 'SMICHAEL9@JWPUB.ORG', phone: '13 98844-8083', role: UserRole.MEMBER, active: true },
    { id: 'm56', name: 'Wesley Vieira Lima', email: 'WesleyLima9@jwpub.org', phone: '11 96473-4684', role: UserRole.MEMBER, active: true },
    { id: 'm57', name: 'Expedito Oliveira', email: '31oliveiraexpedito@jwpub.org', phone: '11 99432-3019', role: UserRole.MEMBER, active: true, congregation: 'Quietude' },
    { id: 'm58', name: 'Italo Oliveira', email: 'italooliveira2@jwpub.org', phone: '13 988855-2955', role: UserRole.MEMBER, active: true, congregation: 'São Vicente' },
    { id: 'm59', name: 'Sidney Silva Branco', email: 'SIDINEYSILVA3@jwpub.org', phone: '13 98126-8552', role: UserRole.MEMBER, active: true, congregation: 'São Vicente' },
    { id: 'm60', name: 'Luis Roberto Rocha', email: 'luizrocha2@jwpul.org', phone: '13 99124-8400', role: UserRole.MEMBER, active: true, congregation: 'Tupiry' },
    { id: 'm61', name: 'Jalrobson Braga', email: 'JALrobsonC@jwpub.org', phone: '13 99760-5860', role: UserRole.MEMBER, active: true, congregation: 'Praia Grande' },
    { id: 'm62', name: 'Nicolas de Santana Godoy R3', email: 'nikolassantana17@jwpub.org', phone: '13 97600-2246', role: UserRole.MEMBER, active: true, congregation: 'Praia Grande' },
    { id: 'm63', name: 'Wagner Moura R3', email: 'WagnerMoura10@jwpub.org', phone: '11 93241-3456', role: UserRole.MEMBER, active: true, congregation: 'Forte' },
    { id: 'm64', name: 'Marcelo Bispo', email: '5bispom@jwpub.org', phone: '19 99676-3272', role: UserRole.MEMBER, active: true, congregation: 'Tupi' },
    { id: 'm65', name: 'Sidinei Fernandes', email: 'sidinei.fernandes@gvp.com', phone: '13 99107-1496', role: UserRole.MEMBER, active: true, congregation: 'Praia Grande' },
    { id: 'm66', name: 'Gilmar Erasmo de Oliveira', email: 'gilmar@gvp.com', phone: '13 98163-5401', role: UserRole.MEMBER, active: true, congregation: 'Bertioga' },
    { id: 'm67', name: 'Antônio Gois', email: 'AntonioleiteGoes1@jwpub.org', phone: '13 99746-6767', role: UserRole.MEMBER, active: true },
    { id: 'm68', name: 'Caio Teixeira', email: 'caio.teixeira@gvp.com', phone: '15 97405-1621', role: UserRole.MEMBER, active: true, congregation: 'Bertioga' },
    { id: 'm69', name: 'Danilo Silva Santos', email: 'danilo.santos@gvp.com', phone: '13 97408-3690', role: UserRole.MEMBER, active: true },
    { id: 'm70', name: 'Wagner Eduardo dos Santos', email: 'swagner42@jwpub.org', phone: '13 98859-2122', role: UserRole.MEMBER, active: true, congregation: 'Cubatão' },
    { id: 'm71', name: 'Fagner Santos', email: 'santosFagner13@jwpub.org', phone: '13 98802-0752', role: UserRole.MEMBER, active: true, congregation: 'Cubatão' },
    { id: 'm72', name: 'Felipe Amaral', email: 'filipeamaral@jwpub.org', phone: '13 99754-1796', role: UserRole.MEMBER, active: true, congregation: 'Santos' },
    { id: 'm73', name: 'Victor Vieira', email: 'Vitorvieria50@jwpub.org', phone: '13.982.080.577', role: UserRole.MEMBER, active: true, congregation: 'Cubatão' },
    { id: 'm74', name: 'Juscelino Barbosa', email: 'JuscelinoB2@jwpub.org', phone: '13 98873.0356', role: UserRole.MEMBER, active: true, congregation: 'Cubatão' },
    { id: 'm75', name: 'Andrews Luiz Santos', email: 'andrews.santos@gvp.com', phone: '1398171-4532', role: UserRole.MEMBER, active: true }
  ] as Member[],
  hospitals: [
    { id: 'h1', name: 'Santa Casa de Santos', city: 'Santos', address: 'Av. Dr. Cláudio Luís da Costa, 50', lat: -23.9452, lng: -46.3345 },
    { id: 'h2', name: 'Hospital Guilherme Álvaro', city: 'Santos', address: 'Rua Oswaldo Cruz, 197', lat: -23.9575, lng: -46.3236 },
    { id: 'h3', name: 'Hospital Ana Costa - Santos', city: 'Santos', address: 'Rua Pedro Américo, 60', lat: -23.9541, lng: -46.3332 },
    { id: 'h4', name: 'Beneficência Portuguesa de Santos', city: 'Santos', address: 'Av. Bernardino de Campos, 47', lat: -23.9515, lng: -46.3312 },
    { id: 'h5', name: 'Hospital Irmã Dulce', city: 'Praia Grande', address: 'Rua Dair Borges, 550', lat: -24.0102, lng: -46.4111 },
    { id: 'h6', name: 'Hospital Santo Amaro', city: 'Guarujá', address: 'Rua Israel, 203', lat: -23.9935, lng: -46.2572 },
    { id: 'h7', name: 'Hospital Municipal de São Vicente', city: 'São Vicente', address: 'Rua Ipiranga, 353', lat: -23.9712, lng: -46.3862 },
    { id: 'h8', name: 'Hospital Regional de Itanhaém', city: 'Itanhaém', address: 'Rua Rui Barbosa, 541', lat: -24.1842, lng: -46.7905 },
    { id: 'h9', name: 'Hospital IGESP - Praia Grande', city: 'Praia Grande', address: 'Rua General Marcondes Salgado, 400', lat: -24.0118, lng: -46.4135 },
    { id: 'h10', name: 'Hospital Casa de Saúde de Santos', city: 'Santos', address: 'Av. Conselheiro Nébias, 644', lat: -23.9592, lng: -46.3235 },
    { id: 'h11', name: 'Hospital Regional de Registro', city: 'Registro', address: 'Rodovia BR-116, km 443', lat: -24.4947, lng: -47.8461 },
    { id: 'h12', name: 'Hospital Infantil Gonzaga', city: 'Santos', address: 'Av. Ana Costa, 411', lat: -23.9634, lng: -46.3315 },
    { id: 'h13', name: 'Hospital São Lucas - Santos', city: 'Santos', address: 'Av. Ana Costa, 168', lat: -23.9502, lng: -46.3325 },
    { id: 'h14', name: 'Hosp São Jose - Itariri', city: 'Itariri', address: 'Rua Principal, Itariri', lat: -24.2889, lng: -47.1736 },
    { id: 'h15', name: 'Hospital Regional Jorge Rossmann', city: 'Itanhaém', address: 'Av. Rui Barbosa, 541', lat: -24.185, lng: -46.791 }
  ] as Hospital[],
  routes: [] as VisitRoute[],
  visits: [] as VisitSlot[],
  socialWorkerVisits: [] as SocialWorkerVisit[],
  patients: [] as Patient[],
  logs: [] as LogEntry[],
  notifications: [] as Notification[]
});

function mapFromDb<T>(data: any[] | null): T[] {
  if (!data || !Array.isArray(data)) return [] as T[];
  return data.map((item: any) => {
    const camelItem: any = {};
    Object.keys(item).forEach(key => {
      const camelKey = key.replace(/(_\w)/g, m => m[1].toUpperCase());
      let val = item[key];
      // Tratamento especial para coordenadas numéricas vindas como strings
      if ((camelKey === 'lat' || camelKey === 'lng') && val != null) {
          val = parseFloat(val);
          if (isNaN(val)) val = undefined;
      }
      camelItem[camelKey] = val;
    });
    return camelItem as T;
  });
}

export const loadState = async (): Promise<AppState> => {
  const defaultState = createDefaultState();
  if (!supabase) return defaultState;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    const fetchAll = await Promise.all([
      supabase.from('members').select('*'),
      supabase.from('hospitals').select('*'),
      supabase.from('routes').select('*'),
      supabase.from('visits').select('*'),
      supabase.from('social_worker_visits').select('*'),
      supabase.from('patients').select('*'),
      supabase.from('logs').select('*'),
      supabase.from('notifications').select('*')
    ]);

    const finalState: AppState = {
      currentUser: null,
      members: mapFromDb<Member>(fetchAll[0].data).length > 0 ? mapFromDb<Member>(fetchAll[0].data) : defaultState.members,
      hospitals: mapFromDb<Hospital>(fetchAll[1].data).length > 0 ? mapFromDb<Hospital>(fetchAll[1].data) : defaultState.hospitals,
      routes: mapFromDb<VisitRoute>(fetchAll[2].data),
      visits: mapFromDb<VisitSlot>(fetchAll[3].data),
      socialWorkerVisits: mapFromDb<SocialWorkerVisit>(fetchAll[4].data),
      patients: mapFromDb<Patient>(fetchAll[5].data),
      logs: mapFromDb<LogEntry>(fetchAll[6].data),
      notifications: mapFromDb<Notification>(fetchAll[7].data)
    };

    if (session?.user) {
      finalState.currentUser = finalState.members.find(m => m.id === session.user.id) || null;
    }

    return finalState;
  } catch (error) {
    console.error("[StorageService] Erro no loadState:", error);
    return defaultState;
  }
};

const sanitizeForDb = (tableName: string, data: any) => {
  const cleanData = { ...data };
  if (tableName === 'members') delete (cleanData as any).password;
  
  const snakeCaseData: any = {};
  Object.keys(cleanData).forEach(key => {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    let val = (cleanData as any)[key];
    // Garante que coordenadas sejam salvas como float ou null, nunca strings quebradas
    if ((key === 'lat' || key === 'lng') && (val == null || isNaN(val))) {
        val = null;
    }
    snakeCaseData[snakeKey] = val;
  });
  return snakeCaseData;
};

export const atomicUpdate = async (tableName: string, data: any) => {
  if (!supabase) return;
  const sanitized = sanitizeForDb(tableName, data);
  const { error } = await supabase.from(tableName).upsert(sanitized);
  if (error) throw error;
};

export const atomicDelete = async (tableName: string, id: string) => {
  if (!supabase) return;
  const { error } = await supabase.from(tableName).delete().eq('id', id);
  if (error) throw error;
};

export const saveState = async (state: AppState): Promise<void> => {
  return Promise.resolve();
};
