/*
  # Importar Equipamentos Cropbio - Parte 1

  1. Importação
    - Importa 50 equipamentos da unidade Cropbio
    - Equipamentos de produção e laboratório
    - Tags iniciando com VAP, TQG, COM, TPA, GER, CHI, etc.
*/

INSERT INTO equipments (id, json_content) VALUES
('cbio001', '{"id":"cbio001","code":"VAP-01","name":"Gerador de Vapor de Gás","description":"Gerador de Vapor de Gás","location":"Cropbio","model":"ICA-GVI - 2200","serialNumber":"","manufacturer":"Icagl","status":"ACTIVE","notes":""}'::jsonb),
('cbio002', '{"id":"cbio002","code":"TQG-01","name":"Tanque GLP 2.000 Kg","description":"Tanque GLP 2.000 Kg","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Nacional Gas","status":"ACTIVE","notes":""}'::jsonb),
('cbio003', '{"id":"cbio003","code":"COM-01","name":"Compressor de ar 15hp","description":"Compressor de ar 15hp","location":"Cropbio","model":"SRP4015E","serialNumber":"","manufacturer":"Schulz","status":"ACTIVE","notes":""}'::jsonb),
('cbio004', '{"id":"cbio004","code":"COM-02","name":"Compressor de ar 50hp","description":"Compressor de ar 50hp","location":"Cropbio","model":"SRP4050E","serialNumber":"","manufacturer":"Schulz","status":"ACTIVE","notes":""}'::jsonb),
('cbio005', '{"id":"cbio005","code":"TPA-01","name":"Tanque Pulmão de ar","description":"Tanque Pulmão de ar","location":"Cropbio","model":"FZR-VSP-1421-2023","serialNumber":"","manufacturer":"Fhaizer","status":"ACTIVE","notes":""}'::jsonb),
('cbio006', '{"id":"cbio006","code":"GER-01","name":"Gerador de Energia","description":"Gerador de Energia","location":"Cropbio","model":"FPT N67 TE5","serialNumber":"","manufacturer":"Leão Geradores","status":"ACTIVE","notes":""}'::jsonb),
('cbio007', '{"id":"cbio007","code":"CHI-01","name":"Chiller","description":"Chiller","location":"Cropbio","model":"SAT.100-AR-380V","serialNumber":"","manufacturer":"Refrisat","status":"ACTIVE","notes":""}'::jsonb),
('cbio008', '{"id":"cbio008","code":"TOR-01","name":"Torre de Resfriamento","description":"Torre de Resfriamento","location":"Cropbio","model":"R+320/12 AP TFGF3ADN","serialNumber":"","manufacturer":"","status":"ACTIVE","notes":""}'::jsonb),
('cbio009', '{"id":"cbio009","code":"OSM-01","name":"Osmose Reversa","description":"Osmose Reversa","location":"Cropbio","model":"ROH010054","serialNumber":"","manufacturer":"Permution","status":"ACTIVE","notes":""}'::jsonb),
('cbio010', '{"id":"cbio010","code":"BIO-01","name":"Biorreator 5.000L","description":"Biorreator 5.000L","location":"Cropbio","model":"ALLMICSRC5000","serialNumber":"","manufacturer":"Allbiom","status":"ACTIVE","notes":""}'::jsonb),
('cbio011', '{"id":"cbio011","code":"BIO-02","name":"Biorreator 5.000L","description":"Biorreator 5.000L","location":"Cropbio","model":"ALLMICSRC5000","serialNumber":"","manufacturer":"Allbiom","status":"ACTIVE","notes":""}'::jsonb),
('cbio012', '{"id":"cbio012","code":"BIO-03","name":"Biorreator 5.000L","description":"Biorreator 5.000L","location":"Cropbio","model":"Biorreator 5.000L","serialNumber":"","manufacturer":"Equipoinox","status":"ACTIVE","notes":""}'::jsonb),
('cbio013', '{"id":"cbio013","code":"BIO-04","name":"Biorreator 1.000L","description":"Biorreator 1.000L","location":"Cropbio","model":"Biorreator 1.000L","serialNumber":"","manufacturer":"Equipoinox","status":"ACTIVE","notes":""}'::jsonb),
('cbio014', '{"id":"cbio014","code":"BIO-05","name":"Biorreator 200L","description":"Biorreator 200L","location":"Cropbio","model":"ALLMICSRC200","serialNumber":"","manufacturer":"Allbiom","status":"ACTIVE","notes":""}'::jsonb),
('cbio015', '{"id":"cbio015","code":"PB-01","name":"Painel de Bombas","description":"Painel de Bombas","location":"Cropbio","model":"","serialNumber":"","manufacturer":"","status":"ACTIVE","notes":""}'::jsonb),
('cbio016', '{"id":"cbio016","code":"PB-02","name":"Painel de Bombas","description":"Painel de Bombas","location":"Cropbio","model":"","serialNumber":"","manufacturer":"","status":"ACTIVE","notes":""}'::jsonb),
('cbio017', '{"id":"cbio017","code":"PB-03","name":"Painel de Bombas","description":"Painel de Bombas","location":"Cropbio","model":"","serialNumber":"","manufacturer":"","status":"ACTIVE","notes":""}'::jsonb),
('cbio018', '{"id":"cbio018","code":"SK-01","name":"Skid Suporte para as Bombas Pneumaticas","description":"Skid Suporte para as Bombas Pneumaticas","location":"Cropbio","model":"","serialNumber":"","manufacturer":"","status":"ACTIVE","notes":""}'::jsonb),
('cbio019', '{"id":"cbio019","code":"SK-02","name":"Skid Suporte para as Bombas Pneumaticas","description":"Skid Suporte para as Bombas Pneumaticas","location":"Cropbio","model":"","serialNumber":"","manufacturer":"","status":"ACTIVE","notes":""}'::jsonb),
('cbio020', '{"id":"cbio020","code":"CIP-01","name":"Sistema CIP","description":"Sistema CIP","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Equipoinox","status":"ACTIVE","notes":""}'::jsonb),
('cbio021', '{"id":"cbio021","code":"TQC-01","name":"Tanque CIP","description":"Tanque CIP","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Equipoinox","status":"ACTIVE","notes":""}'::jsonb),
('cbio022', '{"id":"cbio022","code":"TQC-02","name":"Tanque CIP","description":"Tanque CIP","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Equipoinox","status":"ACTIVE","notes":""}'::jsonb),
('cbio023', '{"id":"cbio023","code":"PL-01","name":"Paleteira 2.000Kg","description":"Paleteira 2.000Kg","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Paletrans","status":"ACTIVE","notes":""}'::jsonb),
('cbio024', '{"id":"cbio024","code":"TQM-01","name":"Tanque de Mistura 1.000L","description":"Tanque de Mistura 1.000L","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Interno","status":"ACTIVE","notes":""}'::jsonb),
('cbio025', '{"id":"cbio025","code":"BN-01","name":"Bomba Nemo","description":"Bomba Nemo","location":"Cropbio","model":"BOMBA NEMO NM038BY01L06B","serialNumber":"","manufacturer":"Netzsch","status":"ACTIVE","notes":""}'::jsonb),
('cbio026', '{"id":"cbio026","code":"BAL-01","name":"Balança 30Kg","description":"Balança 30Kg","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Digitron","status":"ACTIVE","notes":""}'::jsonb),
('cbio027', '{"id":"cbio027","code":"BAL-02","name":"Balança 100Kg","description":"Balança 100Kg","location":"Cropbio","model":"","serialNumber":"","manufacturer":"Digitron","status":"ACTIVE","notes":""}'::jsonb),
('cbio028', '{"id":"cbio028","code":"EST-01","name":"Envolvedora - Strechadeira","description":"Envolvedora - Strechadeira","location":"Cropbio","model":"MASTERPLAT - SEMIAUTOMÁTICA","serialNumber":"","manufacturer":"Robopac","status":"ACTIVE","notes":""}'::jsonb),
('cfb001', '{"id":"cfb001","code":"PE-01","name":"Paleteira Elétrica 2.000Kg","description":"Paleteira Elétrica 2.000Kg","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Top Win","status":"ACTIVE","notes":""}'::jsonb),
('cfb002', '{"id":"cfb002","code":"EE-01","name":"Empilhadeira Elétrica","description":"Empilhadeira Elétrica","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Top Win","status":"ACTIVE","notes":""}'::jsonb),
('cfb003', '{"id":"cfb003","code":"EC-01","name":"Empilhadeira a Combustão","description":"Empilhadeira a Combustão","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Goodsense","status":"ACTIVE","notes":""}'::jsonb),
('cfb004', '{"id":"cfb004","code":"EST-02","name":"Envolvedora - Strechadeira","description":"Envolvedora - Strechadeira","location":"Cropfert do Brasil","model":"MASTERPLAT - SEMIAUTOMÁTICA","serialNumber":"","manufacturer":"Robopac","status":"ACTIVE","notes":""}'::jsonb),
('cfb005', '{"id":"cfb005","code":"ENV-01","name":"Máquina de Envase 01","description":"Máquina de Envase 01","location":"Cropfert do Brasil","model":"QMBAG SEMIAUTOMÁTICA","serialNumber":"","manufacturer":"Quality Machines","status":"ACTIVE","notes":""}'::jsonb),
('cfb006', '{"id":"cfb006","code":"ENV-02","name":"Máquina de Envase 02","description":"Máquina de Envase 02","location":"Cropfert do Brasil","model":"DMS-500MV-BAG","serialNumber":"","manufacturer":"Dmom","status":"ACTIVE","notes":""}'::jsonb),
('cfb007', '{"id":"cfb007","code":"ENV-03","name":"Máquina de Envase 03","description":"Máquina de Envase 03","location":"Cropfert do Brasil","model":"Exata 8/4-16","serialNumber":"","manufacturer":"Robopac","status":"ACTIVE","notes":""}'::jsonb),
('cfb008', '{"id":"cfb008","code":"BAL-03","name":"Balança 6Kg","description":"Balança 6Kg","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Ramuza","status":"ACTIVE","notes":""}'::jsonb),
('cfb009', '{"id":"cfb009","code":"FLA-01","name":"Fluxo Laminar Unidirecional","description":"Fluxo Laminar Unidirecional","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Pachane","status":"ACTIVE","notes":""}'::jsonb),
('cfb010', '{"id":"cfb010","code":"EST-T01","name":"Esteira 7M","description":"Esteira 7M","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Interna","status":"ACTIVE","notes":""}'::jsonb),
('cfb011', '{"id":"cfb011","code":"INK-01","name":"Inkjet","description":"Inkjet","location":"Cropfert do Brasil","model":"CM 730-60SI","serialNumber":"","manufacturer":"Ciclop","status":"ACTIVE","notes":""}'::jsonb),
('cfb012', '{"id":"cfb012","code":"INK-02","name":"Inkjet","description":"Inkjet","location":"Cropfert do Brasil","model":"CM 730-60SI","serialNumber":"","manufacturer":"Ciclop","status":"ACTIVE","notes":""}'::jsonb),
('cfb013', '{"id":"cfb013","code":"SEL-01","name":"Seladora (Fechadora de caixa)","description":"Seladora (Fechadora de caixa)","location":"Cropfert do Brasil","model":"FXJ 6050","serialNumber":"","manufacturer":"Yupack","status":"ACTIVE","notes":""}'::jsonb),
('cfb014', '{"id":"cfb014","code":"INK-03","name":"Inkjet Termal","description":"Inkjet Termal","location":"Cropfert do Brasil","model":"IPS-880","serialNumber":"","manufacturer":"","status":"ACTIVE","notes":""}'::jsonb),
('cfb015', '{"id":"cfb015","code":"SEL-02","name":"Seladora por Indução","description":"Seladora por Indução","location":"Cropfert do Brasil","model":"AM 024 1718","serialNumber":"","manufacturer":"GRC","status":"ACTIVE","notes":""}'::jsonb),
('cfb016', '{"id":"cfb016","code":"SEL-03","name":"Seladora por Indução","description":"Seladora por Indução","location":"Cropfert do Brasil","model":"LGYS-4000","serialNumber":"","manufacturer":"LGYS","status":"ACTIVE","notes":""}'::jsonb),
('cfb017', '{"id":"cfb017","code":"ROT-01","name":"Rotuladora Duplo Sentido","description":"Rotuladora Duplo Sentido","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Jwin","status":"ACTIVE","notes":""}'::jsonb),
('cfb018', '{"id":"cfb018","code":"BAL-04","name":"Balança 5.000 Kg","description":"Balança 5.000 Kg","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Digitron","status":"ACTIVE","notes":""}'::jsonb),
('cfb019', '{"id":"cfb019","code":"BAL-05","name":"Balança 50Kg","description":"Balança 50Kg","location":"Cropfert do Brasil","model":"","serialNumber":"","manufacturer":"Micheletti","status":"MAINTENANCE","notes":"Observação: Quebrada"}'::jsonb),
('cfb020', '{"id":"cfb020","code":"MDF-01","name":"Medidor de Fluxo 01","description":"Medidor de Fluxo 01","location":"Cropfert do Brasil","model":"IFM SM 200","serialNumber":"","manufacturer":"Flow Meter","status":"ACTIVE","notes":""}'::jsonb),
('cfb021', '{"id":"cfb021","code":"MDF-02","name":"Medidor de Fluxo 02","description":"Medidor de Fluxo 02","location":"Cropfert do Brasil","model":"IFM SU 2021","serialNumber":"","manufacturer":"Flow Meter","status":"ACTIVE","notes":""}'::jsonb);
