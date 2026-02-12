import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearExistingEquipments() {
  console.log('Limpando equipamentos existentes...');
  const { error } = await supabase
    .from('equipments')
    .delete()
    .neq('id', '00000000');

  if (error) {
    console.error('Erro ao limpar:', error);
  } else {
    console.log('Equipamentos existentes removidos.');
  }
}

function normalizeEquipment(item) {
  const normalized = {
    id: Math.random().toString(36).substr(2, 9),
    code: item.TAG || '',
    name: item.Equipamento || item.Descrição || item.DESCRIÇÃO || '',
    description: item.Descrição || item.DESCRIÇÃO || item.Equipamento || '',
    location: item.Local || '',
    model: String(item.Modelo || item.MODELO || ''),
    serialNumber: '',
    manufacturer: item.Marca || item.Fabricante || item.MARCA || '',
    status: 'ACTIVE',
    notes: item.col_6 ? `Observação: ${item.col_6}` : ''
  };

  return normalized;
}

const equipmentsData = [
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"INC-01","Equipamento":"Incubadora B.O.D 364L","Marca":"Toth","Modelo":"700.364.2","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"GEL-03","Equipamento":"Geladeira","Marca":"Consul","Modelo":"CRD37E","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"INC-02","Equipamento":"Incubadora refrigerada agitação orbital","Marca":"Toth","Modelo":6430,"Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"HOM-01","Equipamento":"Homogeneizador em V","Marca":"SP Labor","Modelo":"SP-147-6","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BUL-02","Equipamento":"Banho ultrassônico","Marca":"Solidsteel","Modelo":"SSBu","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"ESS-03","Equipamento":"Estufa de secagem com circulação de ar","Marca":"7Lab","Modelo":"SSDic-150L","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"ESS-04","Equipamento":"Estufa de cultura bacteriológica digital","Marca":"7Lab","Modelo":"SSB - 30L","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"ESS-05","Equipamento":"Estufa de secagem","Marca":"7Lab","Modelo":"SSD-150L","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BO-05","Equipamento":"Bomba peristática O.F.A","Marca":"OFA Ambiental","Modelo":"DDC-431","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"MIC-02","Equipamento":"Microscópio óptico binocular","Marca":"Olympus","Modelo":"CX23","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"SEL-04","Equipamento":"Seladora a vácuo","Marca":"Registron","Modelo":"RG-PW300A","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BAL-06","Equipamento":"Balança analítica","Marca":"Shimadzu","Modelo":"ATX224R","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BAL-07","Equipamento":"Balança Analítica 220g","Marca":"Shimadzu","Modelo":"ATX224R","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BAL-08","Equipamento":"Balança Semi-Analítica","Marca":"Marte científica","Modelo":"LS 5","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"DEN-01","Equipamento":"Densimetro","Marca":"Metter toledo","Modelo":"Densimetro de mão","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"VIS-01","Equipamento":"Viscosimêtro","Marca":"IKA","Modelo":"ROTAVISC LOVI S000","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BAL-09","Equipamento":"Balança 300kg","Marca":"Welmy","Modelo":"W-300","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"AGM-03","Equipamento":"Agitador Magnético c/ aquecimento","Marca":"Prolab","Modelo":"Ssa Ga - 10L","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"AMB-02","Equipamento":"Agitador Mecânico","Marca":"Fisatom","Modelo":"715W","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"AGM-04","Equipamento":"Agitador Magnético Grandes Volumes","Marca":"Marte científica","Modelo":"AMGV - 10","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"ESS-06","Equipamento":"Estufa digital de esterilização e secagem","Marca":"Marte científica","Modelo":"MEDI-180","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BFL-01","Equipamento":"Bancada de Fluxo Laminar Lertical","Marca":"Pachane","Modelo":"Pa320","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"PHB-02","Equipamento":"pHmetro","Marca":"Marte científica","Modelo":"OneSense pH2500","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"HPL-01","Equipamento":"HPLC","Marca":"Agilent","Modelo":"1260 infinity 3","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"NBK-03","Equipamento":"Nobreak NGEN","Marca":"Dell","Modelo":"NGEN3","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"CPH-01","Equipamento":"Computador HPLC LAB","Marca":"Rise","Modelo":"Office x1 black","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"MON-01","Equipamento":"Monitor 24\"","Marca":"AOC","Modelo":"24\" Full HD","Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BUL-02","Equipamento":"Banho Ultrassônico c/ aquecimento","Marca":"Mylab","Modelo":null,"Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BO-06","Equipamento":"Bomba de Vácuo c/ compressor","Marca":"Prismatec","Modelo":null,"Local":"Laboratório Apucarana"},
  {"source_file":"Equipamentos - Laboratório de defensivos.xlsx","sheet":"Planilha1","TAG":"BAM-01","Equipamento":"Banho Maria Digital 6L","Marca":"Solidsteel","Modelo":null,"Local":"Laboratório Apucarana"}
];

async function importEquipments() {
  console.log('Iniciando importação de equipamentos...');

  await clearExistingEquipments();

  const equipments = equipmentsData.map(normalizeEquipment);
  console.log(`\nTotal de equipamentos a importar: ${equipments.length}`);

  const batchSize = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < equipments.length; i += batchSize) {
    const batch = equipments.slice(i, i + batchSize);
    const records = batch.map(eq => ({
      id: eq.id,
      json_content: eq
    }));

    try {
      const { error } = await supabase
        .from('equipments')
        .insert(records);

      if (error) {
        console.error(`Erro no lote ${i / batchSize + 1}:`, error);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`Lote ${i / batchSize + 1} importado (${imported}/${equipments.length})`);
      }
    } catch (e) {
      console.error(`Erro ao importar lote ${i / batchSize + 1}:`, e);
      errors += batch.length;
    }
  }

  console.log(`\n=== IMPORTAÇÃO CONCLUÍDA ===`);
  console.log(`Total importado: ${imported}`);
  console.log(`Total de erros: ${errors}`);

  const uniqueLocations = [...new Set(equipments.map(e => e.location))].sort();
  console.log(`\n=== EMPRESAS/LOCAIS ===`);
  uniqueLocations.forEach(loc => {
    const count = equipments.filter(e => e.location === loc).length;
    console.log(`${loc}: ${count} equipamentos`);
  });
}

importEquipments().catch(console.error);
