# 🎯 Multiple Services - Appointments Feature

## Overview

O endpoint de criação de agendamentos agora suporta **múltiplos serviços**, permitindo que clientes agendem vários serviços em uma única sessão.

## 📡 API Endpoint

### POST `/appointments`

**Body:**
```json
{
  "salonId": "uuid",
  "employeeId": "uuid",
  "serviceIds": ["uuid1", "uuid2", "uuid3"],  // Array de serviços
  "appointmentDate": "2024-01-15",
  "startTime": "10:00",
  "clientName": "João Silva",
  "clientEmail": "joao@email.com",
  "clientPhone": "+5511999999999",
  "notes": "Cliente preferencial"
}
```

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas/Modificadas

#### 1. `appointments` (Modificada)
```typescript
appointments {
  id: UUID
  salonId: UUID
  employeeId: UUID
  // serviceId: UUID ❌ REMOVIDO
  
  appointmentDate: DATE
  startTime: TIME
  endTime: TIME
  
  totalDuration: INTEGER   // ✅ NOVO: Soma de todos os serviços
  totalPrice: DECIMAL      // ✅ NOVO: Soma de todos os preços
  
  status: VARCHAR
  clientName: VARCHAR
  clientEmail: VARCHAR
  clientPhone: VARCHAR
  notes: TEXT
  cancellationReason: TEXT
  reminderSent: BOOLEAN
  
  createdAt: TIMESTAMP
  updatedAt: TIMESTAMP
}
```

#### 2. `appointment_services` (Nova Tabela de Relacionamento)
```typescript
appointment_services {
  appointmentId: UUID (FK → appointments.id) CASCADE
  serviceId: UUID (FK → services.id) CASCADE
  
  duration: INTEGER        // Duração no momento da reserva
  price: DECIMAL          // Preço no momento da reserva
  orderIndex: INTEGER     // Ordem dos serviços
  
  PRIMARY KEY (appointmentId, serviceId)
}
```

### Relacionamento

```
appointments (1) ←───→ (N) appointment_services (N) ←───→ (1) services
```

**Exemplo:**
```
Appointment #123:
  ├── Service #1: Haircut (30 min, R$ 25)
  ├── Service #2: Beard Trim (20 min, R$ 15)
  └── Service #3: Hair Styling (15 min, R$ 10)
  
  Total Duration: 65 minutes
  Total Price: R$ 50.00
```

## 🎬 Exemplos de Uso

### 1. Agendamento com Serviço Único (Backward Compatible)

```bash
POST /appointments
{
  "salonId": "salon-123",
  "employeeId": "emp-456",
  "serviceIds": ["svc-haircut"],
  "appointmentDate": "2024-01-15",
  "startTime": "10:00",
  "clientName": "João Silva",
  "clientPhone": "+5511999999999"
}

Response: 201 Created
{
  "id": "appt-789",
  "salonId": "salon-123",
  "employeeId": "emp-456",
  "appointmentDate": "2024-01-15",
  "startTime": "10:00",
  "endTime": "10:30",
  "totalDuration": 30,
  "totalPrice": "25.00",
  "status": "confirmed",
  ...
}
```

### 2. Agendamento com Múltiplos Serviços

```bash
POST /appointments
{
  "salonId": "salon-123",
  "employeeId": "emp-456",
  "serviceIds": ["svc-haircut", "svc-beard", "svc-styling"],
  "appointmentDate": "2024-01-15",
  "startTime": "10:00",
  "clientName": "João Silva",
  "clientEmail": "joao@email.com",
  "clientPhone": "+5511999999999",
  "notes": "Cliente VIP"
}

Response: 201 Created
{
  "id": "appt-789",
  "salonId": "salon-123",
  "employeeId": "emp-456",
  "appointmentDate": "2024-01-15",
  "startTime": "10:00",
  "endTime": "11:05",          // 10:00 + 65 min
  "totalDuration": 65,          // 30 + 20 + 15
  "totalPrice": "50.00",        // 25 + 15 + 10
  "status": "confirmed",
  "clientName": "João Silva",
  "clientEmail": "joao@email.com",
  "clientPhone": "+5511999999999",
  "notes": "Cliente VIP",
  ...
}

// Cria automaticamente 3 registros em appointment_services:
[
  { appointmentId: "appt-789", serviceId: "svc-haircut", duration: 30, price: "25.00", orderIndex: 0 },
  { appointmentId: "appt-789", serviceId: "svc-beard", duration: 20, price: "15.00", orderIndex: 1 },
  { appointmentId: "appt-789", serviceId: "svc-styling", duration: 15, price: "10.00", orderIndex: 2 }
]
```

### 3. Pacote Completo

```bash
POST /appointments
{
  "salonId": "salon-123",
  "employeeId": "emp-456",
  "serviceIds": [
    "svc-haircut",
    "svc-beard",
    "svc-styling",
    "svc-massage",
    "svc-wax"
  ],
  "appointmentDate": "2024-01-15",
  "startTime": "14:00",
  "clientName": "Pedro Santos",
  "clientPhone": "+5511988888888"
}

Response: 201 Created
{
  "id": "appt-999",
  "totalDuration": 120,        // 30+20+15+30+25 = 2 horas
  "totalPrice": "120.00",
  "startTime": "14:00",
  "endTime": "16:00"
}
```

## 🔧 Fluxo de Criação

```
1. Validar Salon existe
   ↓
2. Validar Employee existe e pertence ao salão
   ↓
3. Para cada serviço:
   - Validar serviço existe
   - Validar serviço pertence ao salão
   - Validar employee pode executar o serviço
   - Somar duração total
   - Somar preço total
   ↓
4. Validar data/hora do agendamento
   - Não no passado
   - Respeita antecedência mínima
   - Não excede máximo de dias
   - Dentro do horário do employee
   - Serviço cabe no expediente
   ↓
5. Calcular endTime (startTime + totalDuration)
   ↓
6. Verificar conflitos
   - Sem sobreposição com outros agendamentos
   ↓
7. Criar Appointment (tabela principal)
   ↓
8. Criar AppointmentServices (relacionamentos)
   - Um registro para cada serviço
   - Com orderIndex para preservar ordem
   ↓
9. Retornar appointment criado
```

## 📊 Validações Implementadas

| Validação | Descrição | Error |
|-----------|-----------|-------|
| Salon exists | Salão deve existir | `NotFoundException` |
| Employee exists | Funcionário deve existir | `NotFoundException` |
| Employee belongs to salon | Funcionário do salão correto | `BadRequestException` |
| All services exist | Cada serviço deve existir | `NotFoundException` |
| Services belong to salon | Todos os serviços do salão | `BadRequestException` |
| Employee can perform | Funcionário atribuído a todos | `BadRequestException` |
| Total duration > 0 | Duração total válida | `BadRequestException` |
| Date not in past | Data futura | `BadRequestException` |
| Min advance booking | Antecedência mínima | `BadRequestException` |
| Max advance booking | Não excede máximo | `BadRequestException` |
| Employee works day | Trabalha no dia | `BadRequestException` |
| Within schedule | Dentro do expediente | `BadRequestException` |
| Service fits | Cabe antes do fim | `BadRequestException` |
| No conflicts | Sem sobreposição | `ConflictException` |

## 💡 Benefícios

### 1. ✅ Cachê de Valores
```typescript
// Preços e durações são salvos no momento da reserva
appointment_services {
  serviceId: "svc-haircut",
  duration: 30,    // ← Valor na hora da reserva
  price: "25.00"   // ← Preço na hora da reserva
}

// Se o serviço mudar depois:
services {
  id: "svc-haircut",
  duration: 40,    // ← Mudou para 40 min
  price: "30.00"   // ← Mudou para R$ 30
}

// O agendamento mantém os valores originais! ✅
// Histórico preservado para relatórios
```

### 2. ✅ Ordem dos Serviços
```typescript
// orderIndex preserva a ordem escolhida pelo cliente
[
  { serviceId: "svc-haircut", orderIndex: 0 },    // 1º
  { serviceId: "svc-beard", orderIndex: 1 },      // 2º
  { serviceId: "svc-styling", orderIndex: 2 }     // 3º
]

// Útil para:
// - Exibir na ordem correta
// - Executar na sequência planejada
// - Relatórios detalhados
```

### 3. ✅ Flexibilidade
```typescript
// Frontend pode buscar serviços detalhados:
GET /appointments/appt-123

Response:
{
  "id": "appt-123",
  "totalDuration": 65,
  "totalPrice": "50.00",
  "services": [
    {
      "serviceId": "svc-1",
      "serviceName": "Haircut",       // Join com services
      "duration": 30,
      "price": "25.00",
      "orderIndex": 0
    },
    {
      "serviceId": "svc-2",
      "serviceName": "Beard Trim",
      "duration": 20,
      "price": "15.00",
      "orderIndex": 1
    }
  ]
}
```

## 🎯 Casos de Uso Reais

### Cenário 1: Corte Simples
```json
{
  "serviceIds": ["svc-haircut"],
  "startTime": "10:00"
}
→ Duração: 30 min
→ Fim: 10:30
→ Preço: R$ 25
```

### Cenário 2: Corte + Barba
```json
{
  "serviceIds": ["svc-haircut", "svc-beard"],
  "startTime": "10:00"
}
→ Duração: 50 min (30+20)
→ Fim: 10:50
→ Preço: R$ 40 (25+15)
```

### Cenário 3: Pacote Premium
```json
{
  "serviceIds": [
    "svc-haircut",    // 30 min, R$ 25
    "svc-beard",      // 20 min, R$ 15
    "svc-styling",    // 15 min, R$ 10
    "svc-massage",    // 30 min, R$ 30
    "svc-coloring"    // 45 min, R$ 50
  ],
  "startTime": "14:00"
}
→ Duração: 140 min (2h 20min)
→ Fim: 16:20
→ Preço: R$ 130
```

## 🔄 Integração com Available Slots

O endpoint de slots disponíveis já foi atualizado anteriormente para suportar múltiplos serviços:

```typescript
// 1. Cliente seleciona serviços
const selectedServices = ["svc-haircut", "svc-beard", "svc-styling"];

// 2. Busca horários disponíveis
GET /appointments/available-slots
  ?employeeId=emp-123
  &serviceIds=svc-haircut,svc-beard,svc-styling
  &date=2024-01-15

Response: ["09:00", "09:10", "10:00", "14:00", ...]

// 3. Cliente escolhe horário
const selectedTime = "10:00";

// 4. Cria agendamento
POST /appointments
{
  "employeeId": "emp-123",
  "serviceIds": ["svc-haircut", "svc-beard", "svc-styling"],
  "date": "2024-01-15",
  "startTime": "10:00",
  ...
}

→ Sucesso garantido! ✅
```

## 📝 DTO de Validação

```typescript
// create-appointment.dto.ts
{
  salonId: string;                // UUID, required
  employeeId: string;             // UUID, required
  serviceIds: string[];           // Array de UUIDs, min 1, required
  appointmentDate: string;        // YYYY-MM-DD, required
  startTime: string;              // HH:MM, required
  clientName: string;             // Min 2, Max 255, required
  clientEmail?: string;           // Email válido, optional
  clientPhone: string;            // Min 10, Max 50, required
  notes?: string;                 // Max 2000, optional
}
```

## 🚫 Limitações e Regras

### 1. Update de Serviços
```typescript
// ❌ NÃO é possível alterar os serviços de um agendamento existente
PATCH /appointments/appt-123
{
  "serviceIds": ["new-service"]  // ❌ Não suportado
}

// ✅ Solução: Cancelar e criar novo
DELETE /appointments/appt-123
POST /appointments { ... }
```

**Motivo:** Manter histórico e integridade dos dados.

### 2. Mínimo de 1 Serviço
```json
{
  "serviceIds": []  // ❌ Error: At least one service is required
}
```

### 3. Todos os Serviços do Mesmo Salão
```json
{
  "salonId": "salon-1",
  "serviceIds": [
    "svc-salon-1",  // ✅
    "svc-salon-2"   // ❌ Error: Service does not belong to salon
  ]
}
```

### 4. Employee Deve Poder Fazer Todos
```json
{
  "employeeId": "emp-barber",
  "serviceIds": [
    "svc-haircut",   // ✅ Employee can do
    "svc-massage"    // ❌ Error: Employee cannot perform service
  ]
}
```

## 📊 Queries Úteis

### Buscar Agendamento com Serviços

```sql
-- Appointment básico
SELECT * FROM appointments WHERE id = 'appt-123';

-- Com serviços
SELECT 
  a.*,
  asvc.service_id,
  asvc.duration,
  asvc.price,
  asvc.order_index,
  s.name as service_name
FROM appointments a
JOIN appointment_services asvc ON a.id = asvc.appointment_id
JOIN services s ON asvc.service_id = s.id
WHERE a.id = 'appt-123'
ORDER BY asvc.order_index;
```

### Total de Receita por Serviço

```sql
SELECT 
  s.name,
  COUNT(*) as total_bookings,
  SUM(asvc.price) as total_revenue
FROM appointment_services asvc
JOIN services s ON asvc.service_id = s.id
JOIN appointments a ON asvc.appointment_id = a.id
WHERE a.status = 'completed'
GROUP BY s.id, s.name
ORDER BY total_revenue DESC;
```

### Serviços Mais Populares em Combo

```sql
SELECT 
  s1.name as service_1,
  s2.name as service_2,
  COUNT(*) as combo_count
FROM appointment_services asvc1
JOIN appointment_services asvc2 
  ON asvc1.appointment_id = asvc2.appointment_id 
  AND asvc1.service_id < asvc2.service_id
JOIN services s1 ON asvc1.service_id = s1.id
JOIN services s2 ON asvc2.service_id = s2.id
GROUP BY s1.id, s1.name, s2.id, s2.name
ORDER BY combo_count DESC
LIMIT 10;
```

## ✅ Conclusão

Feature completa e pronta para produção! 🎉

**Principais pontos:**
- ✅ Suporta 1 ou múltiplos serviços
- ✅ Tabela de relacionamento normalizada
- ✅ Cachê de preços e durações
- ✅ Ordem preservada (orderIndex)
- ✅ Validação completa
- ✅ Integração com available slots
- ✅ Build successful
- ✅ Zero erros de lint

**Benefícios:**
- Melhor UX (cliente agenda tudo de uma vez)
- Dados históricos preservados
- Relatórios detalhados possíveis
- Estrutura escalável
- Queries eficientes

**Próximos passos sugeridos:**
1. Adicionar endpoint GET /appointments/:id/services
2. Relatórios de combos mais vendidos
3. Sugestão automática de serviços complementares
4. Descontos para pacotes





