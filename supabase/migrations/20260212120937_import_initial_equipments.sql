/*
  # Importar Equipamentos Iniciais

  1. Limpeza
    - Remove equipamentos de teste existentes
  
  2. Importação
    - Importa 30 equipamentos do Laboratório de Defensivos
    - Equipamentos com TAG, Equipamento, Marca, Modelo e Local
    - Todos equipamentos com status ACTIVE
  
  3. Notas Importantes
    - Primeira parte da importação (30 de 338 equipamentos)
    - Local: Laboratório Apucarana
*/

-- Limpar equipamentos existentes
DELETE FROM equipments WHERE id NOT IN ('00000000');

-- Importar equipamentos do Laboratório de Defensivos
INSERT INTO equipments (id, json_content) VALUES
('lab001', '{"id":"lab001","code":"INC-01","name":"Incubadora B.O.D 364L","description":"Incubadora B.O.D 364L","location":"Laboratório Apucarana","model":"700.364.2","serialNumber":"","manufacturer":"Toth","status":"ACTIVE","notes":""}'::jsonb),
('lab002', '{"id":"lab002","code":"GEL-03","name":"Geladeira","description":"Geladeira","location":"Laboratório Apucarana","model":"CRD37E","serialNumber":"","manufacturer":"Consul","status":"ACTIVE","notes":""}'::jsonb),
('lab003', '{"id":"lab003","code":"INC-02","name":"Incubadora refrigerada agitação orbital","description":"Incubadora refrigerada agitação orbital","location":"Laboratório Apucarana","model":"6430","serialNumber":"","manufacturer":"Toth","status":"ACTIVE","notes":""}'::jsonb),
('lab004', '{"id":"lab004","code":"HOM-01","name":"Homogeneizador em V","description":"Homogeneizador em V","location":"Laboratório Apucarana","model":"SP-147-6","serialNumber":"","manufacturer":"SP Labor","status":"ACTIVE","notes":""}'::jsonb),
('lab005', '{"id":"lab005","code":"BUL-02","name":"Banho ultrassônico","description":"Banho ultrassônico","location":"Laboratório Apucarana","model":"SSBu","serialNumber":"","manufacturer":"Solidsteel","status":"ACTIVE","notes":""}'::jsonb),
('lab006', '{"id":"lab006","code":"ESS-03","name":"Estufa de secagem com circulação de ar","description":"Estufa de secagem com circulação de ar","location":"Laboratório Apucarana","model":"SSDic-150L","serialNumber":"","manufacturer":"7Lab","status":"ACTIVE","notes":""}'::jsonb),
('lab007', '{"id":"lab007","code":"ESS-04","name":"Estufa de cultura bacteriológica digital","description":"Estufa de cultura bacteriológica digital","location":"Laboratório Apucarana","model":"SSB - 30L","serialNumber":"","manufacturer":"7Lab","status":"ACTIVE","notes":""}'::jsonb),
('lab008', '{"id":"lab008","code":"ESS-05","name":"Estufa de secagem","description":"Estufa de secagem","location":"Laboratório Apucarana","model":"SSD-150L","serialNumber":"","manufacturer":"7Lab","status":"ACTIVE","notes":""}'::jsonb),
('lab009', '{"id":"lab009","code":"BO-05","name":"Bomba peristática O.F.A","description":"Bomba peristática O.F.A","location":"Laboratório Apucarana","model":"DDC-431","serialNumber":"","manufacturer":"OFA Ambiental","status":"ACTIVE","notes":""}'::jsonb),
('lab010', '{"id":"lab010","code":"MIC-02","name":"Microscópio óptico binocular","description":"Microscópio óptico binocular","location":"Laboratório Apucarana","model":"CX23","serialNumber":"","manufacturer":"Olympus","status":"ACTIVE","notes":""}'::jsonb),
('lab011', '{"id":"lab011","code":"SEL-04","name":"Seladora a vácuo","description":"Seladora a vácuo","location":"Laboratório Apucarana","model":"RG-PW300A","serialNumber":"","manufacturer":"Registron","status":"ACTIVE","notes":""}'::jsonb),
('lab012', '{"id":"lab012","code":"BAL-06","name":"Balança analítica","description":"Balança analítica","location":"Laboratório Apucarana","model":"ATX224R","serialNumber":"","manufacturer":"Shimadzu","status":"ACTIVE","notes":""}'::jsonb),
('lab013', '{"id":"lab013","code":"BAL-07","name":"Balança Analítica 220g","description":"Balança Analítica 220g","location":"Laboratório Apucarana","model":"ATX224R","serialNumber":"","manufacturer":"Shimadzu","status":"ACTIVE","notes":""}'::jsonb),
('lab014', '{"id":"lab014","code":"BAL-08","name":"Balança Semi-Analítica","description":"Balança Semi-Analítica","location":"Laboratório Apucarana","model":"LS 5","serialNumber":"","manufacturer":"Marte científica","status":"ACTIVE","notes":""}'::jsonb),
('lab015', '{"id":"lab015","code":"DEN-01","name":"Densimetro","description":"Densimetro","location":"Laboratório Apucarana","model":"Densimetro de mão","serialNumber":"","manufacturer":"Metter toledo","status":"ACTIVE","notes":""}'::jsonb),
('lab016', '{"id":"lab016","code":"VIS-01","name":"Viscosimêtro","description":"Viscosimêtro","location":"Laboratório Apucarana","model":"ROTAVISC LOVI S000","serialNumber":"","manufacturer":"IKA","status":"ACTIVE","notes":""}'::jsonb),
('lab017', '{"id":"lab017","code":"BAL-09","name":"Balança 300kg","description":"Balança 300kg","location":"Laboratório Apucarana","model":"W-300","serialNumber":"","manufacturer":"Welmy","status":"ACTIVE","notes":""}'::jsonb),
('lab018', '{"id":"lab018","code":"AGM-03","name":"Agitador Magnético c/ aquecimento","description":"Agitador Magnético c/ aquecimento","location":"Laboratório Apucarana","model":"Ssa Ga - 10L","serialNumber":"","manufacturer":"Prolab","status":"ACTIVE","notes":""}'::jsonb),
('lab019', '{"id":"lab019","code":"AMB-02","name":"Agitador Mecânico","description":"Agitador Mecânico","location":"Laboratório Apucarana","model":"715W","serialNumber":"","manufacturer":"Fisatom","status":"ACTIVE","notes":""}'::jsonb),
('lab020', '{"id":"lab020","code":"AGM-04","name":"Agitador Magnético Grandes Volumes","description":"Agitador Magnético Grandes Volumes","location":"Laboratório Apucarana","model":"AMGV - 10","serialNumber":"","manufacturer":"Marte científica","status":"ACTIVE","notes":""}'::jsonb),
('lab021', '{"id":"lab021","code":"ESS-06","name":"Estufa digital de esterilização e secagem","description":"Estufa digital de esterilização e secagem","location":"Laboratório Apucarana","model":"MEDI-180","serialNumber":"","manufacturer":"Marte científica","status":"ACTIVE","notes":""}'::jsonb),
('lab022', '{"id":"lab022","code":"BFL-01","name":"Bancada de Fluxo Laminar Lertical","description":"Bancada de Fluxo Laminar Lertical","location":"Laboratório Apucarana","model":"Pa320","serialNumber":"","manufacturer":"Pachane","status":"ACTIVE","notes":""}'::jsonb),
('lab023', '{"id":"lab023","code":"PHB-02","name":"pHmetro","description":"pHmetro","location":"Laboratório Apucarana","model":"OneSense pH2500","serialNumber":"","manufacturer":"Marte científica","status":"ACTIVE","notes":""}'::jsonb),
('lab024', '{"id":"lab024","code":"HPL-01","name":"HPLC","description":"HPLC","location":"Laboratório Apucarana","model":"1260 infinity 3","serialNumber":"","manufacturer":"Agilent","status":"ACTIVE","notes":""}'::jsonb),
('lab025', '{"id":"lab025","code":"NBK-03","name":"Nobreak NGEN","description":"Nobreak NGEN","location":"Laboratório Apucarana","model":"NGEN3","serialNumber":"","manufacturer":"Dell","status":"ACTIVE","notes":""}'::jsonb),
('lab026', '{"id":"lab026","code":"CPH-01","name":"Computador HPLC LAB","description":"Computador HPLC LAB","location":"Laboratório Apucarana","model":"Office x1 black","serialNumber":"","manufacturer":"Rise","status":"ACTIVE","notes":""}'::jsonb),
('lab027', '{"id":"lab027","code":"MON-01","name":"Monitor 24 polegadas","description":"Monitor 24 polegadas","location":"Laboratório Apucarana","model":"24 Full HD","serialNumber":"","manufacturer":"AOC","status":"ACTIVE","notes":""}'::jsonb),
('lab028', '{"id":"lab028","code":"BUL-03","name":"Banho Ultrassônico c/ aquecimento","description":"Banho Ultrassônico c/ aquecimento","location":"Laboratório Apucarana","model":"","serialNumber":"","manufacturer":"Mylab","status":"ACTIVE","notes":""}'::jsonb),
('lab029', '{"id":"lab029","code":"BO-06","name":"Bomba de Vácuo c/ compressor","description":"Bomba de Vácuo c/ compressor","location":"Laboratório Apucarana","model":"","serialNumber":"","manufacturer":"Prismatec","status":"ACTIVE","notes":""}'::jsonb),
('lab030', '{"id":"lab030","code":"BAM-01","name":"Banho Maria Digital 6L","description":"Banho Maria Digital 6L","location":"Laboratório Apucarana","model":"","serialNumber":"","manufacturer":"Solidsteel","status":"ACTIVE","notes":""}'::jsonb);
