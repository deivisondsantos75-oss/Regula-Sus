// Cria as tabelas e carrega unidades/pacientes de exemplo (se o banco estiver vazio).
// Uso: pnpm db:setup            (usa DATABASE_URL do ambiente ou de .env.local)
//      pnpm db:setup --reset    (apaga e recria tudo)
import { readFileSync, existsSync } from 'node:fs'
import pg from 'pg'

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL não definida. Veja .env.example')
  process.exit(1)
}

const reset = process.argv.includes('--reset')
if (reset) {
  // trava de segurança: --reset apaga TUDO; só roda em banco local, a menos que se confirme explicitamente
  const host = new URL(process.env.DATABASE_URL).hostname
  const local = ['localhost', '127.0.0.1', '::1', ''].includes(host)
  if (!local && !process.argv.includes('--i-know-this-erases-everything')) {
    console.error(`Recusado: --reset apagaria o banco REMOTO "${host}". Para forçar: --reset --i-know-this-erases-everything`)
    process.exit(1)
  }
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

if (reset) {
  await client.query('DROP TABLE IF EXISTS audit_log, patients, units CASCADE')
  console.log('Tabelas antigas removidas.')
}
await client.query(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'))
console.log('Esquema aplicado.')

const { rows } = await client.query('SELECT count(*)::int AS n FROM units')
if (rows[0].n === 0) {
  const units = [
    ['UBS Pituaçu', 'Salvador', 1, 'Atenção básica', ['clinica_geral', 'pediatria', 'obstetricia'], 12, 7, 'todos'],
    ['UPA 24h Brotas', 'Salvador', 2, 'Urgência (UPA)', ['clinica_geral', 'pediatria', 'ortopedia', 'pneumologia'], 20, 6],
    ['UPA 24h Pirajá', 'Salvador', 2, 'Urgência (UPA)', ['clinica_geral', 'pediatria', 'trauma'], 18, 0],
    ['Hospital Municipal de Salvador', 'Salvador', 3, 'Média complexidade', ['clinica_geral', 'pediatria', 'cirurgia_geral', 'ortopedia', 'obstetricia', 'pneumologia'], 80, 9],
    ['Hospital Geral Roberto Santos', 'Salvador', 4, 'Alta complexidade', ['clinica_geral', 'cirurgia_geral', 'cardiologia', 'neurologia', 'trauma', 'nefrologia', 'psiquiatria', 'pneumologia', 'uti'], 300, 11],
    ['Hospital Ana Nery', 'Salvador', 4, 'Alta complexidade', ['clinica_geral', 'cardiologia', 'pediatria', 'cirurgia_geral', 'oncologia', 'uti'], 220, 4],
    ['Maternidade Climério de Oliveira', 'Salvador', 4, 'Alta complexidade', ['obstetricia', 'pediatria', 'uti'], 120, 8],
    ['Hospital Regional de Feira de Santana', 'Feira de Santana', 3, 'Média complexidade', ['clinica_geral', 'pediatria', 'cirurgia_geral', 'ortopedia', 'obstetricia'], 90, 14],
    ['Hospital Estadual da Criança', 'Feira de Santana', 4, 'Alta complexidade', ['pediatria', 'cirurgia_geral', 'uti'], 60, 3],
    ['Hospital de Base Luís Eduardo Magalhães', 'Itabuna', 4, 'Alta complexidade', ['clinica_geral', 'cardiologia', 'neurologia', 'trauma', 'cirurgia_geral', 'uti'], 150, 6],
  ]
  const AUDIENCE = { 'Hospital Estadual da Criança': 'pediatrico', 'Maternidade Climério de Oliveira': 'materno_infantil' }
  for (const u of units) {
    await client.query(
      'INSERT INTO units (name, city, level, level_label, specialties, total_beds, available_beds, audience) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [...u.slice(0, 7), AUDIENCE[u[0]] ?? 'todos'],
    )
  }
  console.log(`${units.length} unidades de exemplo inseridas.`)

  const mins = (m) => new Date(Date.now() - m * 60000)
  const patients = [
    ['Maria das Graças Souza', 67, 'F', 'Salvador', 'Dor no peito intensa há 40 minutos, irradiando para o braço esquerdo, com suor frio e náusea.', 'Hipertensão, diabetes tipo 2', 92, 58, 118, 91, 36.4, 26, 15, 35],
    ['João Pedro Almeida', 8, 'M', 'Salvador', 'Febre alta há 2 dias e dificuldade para respirar, com chiado no peito.', 'Asma', 100, 60, 128, 90, 39.4, 32, 15, 50],
    ['Carlos Eduardo Lima', 45, 'M', 'Feira de Santana', 'Queda de moto, trauma em perna direita com deformidade e dor intensa. Sem perda de consciência.', null, 130, 80, 98, 97, 36.8, 20, 15, 20],
    ['Ana Beatriz Ferreira', 29, 'F', 'Salvador', 'Gestante de 36 semanas com dor de cabeça forte, visão turva e pressão elevada.', 'Pré-eclâmpsia em gestação anterior', 168, 108, 96, 96, 36.6, 20, 15, 15],
    ['Raimundo Nonato Santos', 74, 'M', 'Itabuna', 'Confusão mental súbita e fraqueza no lado direito do corpo, fala arrastada há 1 hora.', 'Hipertensão, fibrilação atrial', 188, 104, 88, 94, 36.7, 18, 12, 40],
    ['Luciana Barbosa', 34, 'F', 'Salvador', 'Dor de garganta e tosse há 3 dias, sem falta de ar.', null, 118, 76, 82, 98, 37.4, 16, 15, 10],
    ['Pedro Henrique Costa', 52, 'M', 'Salvador', 'Dor abdominal forte na região direita inferior, vômitos e febre baixa desde ontem.', null, 126, 82, 102, 97, 37.9, 20, 15, 5],
  ]
  for (const p of patients) {
    await client.query(
      `INSERT INTO patients (name, age, sex, city, complaint, comorbidities, systolic, diastolic, heart_rate, spo2, temperature, resp_rate, glasgow, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [...p.slice(0, 13), mins(p[13])],
    )
  }
  console.log(`${patients.length} pacientes fictícios inseridos (sem triagem: use "Analisar com IA").`)
} else {
  // bancos criados antes da coluna "audience": corrige as unidades especializadas
  await client.query("UPDATE units SET audience='pediatrico' WHERE name='Hospital Estadual da Criança' AND audience='todos'")
  await client.query("UPDATE units SET audience='materno_infantil' WHERE name='Maternidade Climério de Oliveira' AND audience='todos'")
  console.log('Banco já possui dados; seed ignorado.')
}
await client.end()
