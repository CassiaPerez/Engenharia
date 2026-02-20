import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const inventoryData = JSON.parse(fs.readFileSync('./cropbio/inventario_completo.json', 'utf-8'));

async function importInventory() {
  console.log('🚀 Iniciando importação do inventário completo do Cropbio...');

  const items = inventoryData.sheets.Planilha1;
  console.log(`📦 Total de itens a importar: ${items.length}`);

  const materialsToInsert = items.map(item => ({
    id: `cbio_inv_${item['ID do item']}`,
    code: `CBIO-${item['ID do item']}`,
    description: item['Nome do item'] || 'Sem descrição',
    group: 'Materiais',
    unit: 'Un',
    current_stock: item['Quantidade'] || 0,
    min_stock: 5,
    unit_cost: item['Preço UN'] || 0,
    location: 'Cropbio',
    status: 'ACTIVE'
  }));

  console.log(`📊 Preparados ${materialsToInsert.length} materiais para inserção`);
  console.log('Exemplo do primeiro material:', JSON.stringify(materialsToInsert[0], null, 2));

  const batchSize = 100;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < materialsToInsert.length; i += batchSize) {
    const batch = materialsToInsert.slice(i, i + batchSize);

    console.log(`\n📦 Importando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(materialsToInsert.length / batchSize)} (${batch.length} itens)...`);

    try {
      const { data, error } = await supabase
        .from('materials')
        .insert(batch);

      if (error) {
        console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors += batch.length;
      } else {
        imported += batch.length;
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} importado com sucesso`);
      }
    } catch (e) {
      console.error(`❌ Exceção no lote ${Math.floor(i / batchSize) + 1}:`, e.message);
      errors += batch.length;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ IMPORTAÇÃO CONCLUÍDA!`);
  console.log(`  - Importados: ${imported}`);
  console.log(`  - Erros: ${errors}`);
  console.log(`  - Total: ${imported + errors}`);

  const { count, error: countError } = await supabase
    .from('materials')
    .select('*', { count: 'exact', head: true })
    .eq('location', 'Cropbio');

  if (!countError) {
    console.log(`\n📊 Total de materiais Cropbio no banco: ${count}`);
  }
}

importInventory().catch(console.error);
