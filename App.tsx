import { useState, useEffect, useCallback } from "react";

// ─── Honey Types & Norms ──────────────────────────────────────────────────────

type HoneyKind =
  | "floral"
  | "linden"
  | "buckwheat"
  | "sunflower"
  | "acacia"
  | "chestnut"
  | "other";

interface HoneyNorm {
  id: HoneyKind;
  label: string;
  emoji: string;
  diasMin_19792: number; // ГОСТ 19792-2017
  diasMin_31766: number; // ГОСТ 31766-2012
  prolineMin_19792: number; // ГОСТ 19792-2017
  prolineMin_31766: number; // ГОСТ 31766-2012
  fgMin: number; // Ф/Г — одинаково для всех ≥ 1,1
  note?: string;
}

const HONEY_NORMS: HoneyNorm[] = [
  {
    id: "floral",
    label: "Цветочный",
    emoji: "🌸",
    diasMin_19792: 8,
    diasMin_31766: 8,
    prolineMin_19792: 180,
    prolineMin_31766: 190,
    fgMin: 1.1,
    note: "Мёд из смеси цветочных нектаров",
  },
  {
    id: "linden",
    label: "Липовый",
    emoji: "🌿",
    diasMin_19792: 8,
    diasMin_31766: 8,
    prolineMin_19792: 180,
    prolineMin_31766: 180,
    fgMin: 1.1,
    note: "Нежный аромат, светло-жёлтый цвет",
  },
  {
    id: "buckwheat",
    label: "Гречишный",
    emoji: "🌾",
    diasMin_19792: 18,
    diasMin_31766: 18,
    prolineMin_19792: 180,
    prolineMin_31766: 190,
    fgMin: 1.1,
    note: "Повышенная норма диастазы — характерна для тёмных сортов",
  },
  {
    id: "sunflower",
    label: "Подсолнечниковый",
    emoji: "🌻",
    diasMin_19792: 15,
    diasMin_31766: 15,
    prolineMin_19792: 180,
    prolineMin_31766: 250,
    fgMin: 1.1,
    note: "Быстро кристаллизуется, высокий пролин",
  },
  {
    id: "acacia",
    label: "Акациевый",
    emoji: "🤍",
    diasMin_19792: 5,
    diasMin_31766: 5,
    prolineMin_19792: 180,
    prolineMin_31766: 180,
    fgMin: 1.1,
    note: "Низкая норма диастазы — природная особенность акациевого мёда",
  },
  {
    id: "chestnut",
    label: "Каштановый",
    emoji: "🌰",
    diasMin_19792: 10,
    diasMin_31766: 10,
    prolineMin_19792: 180,
    prolineMin_31766: 300,
    fgMin: 1.1,
    note: "Высокий норматив пролина, горьковатый привкус",
  },
  {
    id: "other",
    label: "Прочие виды",
    emoji: "🍯",
    diasMin_19792: 8,
    diasMin_31766: 8,
    prolineMin_19792: 180,
    prolineMin_31766: 190,
    fgMin: 1.1,
    note: "Применяется при отсутствии специфичной нормы",
  },
];

type GostType = "19792" | "31766";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SugarResult {
  currentRatio: number;
  targetRatio: number;
  status: "ok" | "low";
  addFructose: number;
  newFructose: number;
  newGlucose: number;
  newRatio: number;
  steps: string[];
}

interface DiasResult {
  current: number;
  target: number;
  status: "ok" | "low";
  addVeron_per100: number;
  addVeron_batch: number;
  newDias: number;
  steps: string[];
}

interface ProlineResult {
  current: number;
  target: number;
  status: "ok" | "low";
  addProline_per100: number;
  addProline_batch: number;
  newProline: number;
  steps: string[];
}

// ─── Calculation Engines ──────────────────────────────────────────────────────
function calcSugars(
  glucosePct: number,
  fructosePct: number,
  targetRatio: number,
  batchKg: number
): SugarResult {
  const currentRatio = fructosePct / glucosePct;
  const steps: string[] = [];

  steps.push(
    `Текущее Ф/Г = ${fructosePct.toFixed(2)}% / ${glucosePct.toFixed(2)}% = ${currentRatio.toFixed(4)}`
  );
  steps.push(`Целевое соотношение Ф/Г ≥ ${targetRatio} (норма по ГОСТ 19792 и ГОСТ 31766)`);

  if (currentRatio >= targetRatio) {
    steps.push("✅ Соотношение соответствует норме — коррекция не требуется.");
    return {
      currentRatio, targetRatio, status: "ok",
      addFructose: 0, newFructose: fructosePct,
      newGlucose: glucosePct, newRatio: currentRatio, steps,
    };
  }

  const xMin = targetRatio * glucosePct - fructosePct;
  const x = parseFloat(Math.max(xMin, 0).toFixed(4));
  const newTotal = 100 + x;
  const newFructose = ((fructosePct + x) / newTotal) * 100;
  const newGlucose = (glucosePct / newTotal) * 100;
  const newRatio = newFructose / newGlucose;

  steps.push(
    `Дефицит фруктозы на 100 кг: x = ${targetRatio} × ${glucosePct.toFixed(2)} − ${fructosePct.toFixed(2)} = ${xMin.toFixed(4)} кг`
  );
  steps.push(`Добавляем x = ${x.toFixed(4)} кг фруктозы на 100 кг купажа`);
  steps.push(`Новая суммарная масса: 100 + ${x.toFixed(4)} = ${newTotal.toFixed(4)} кг`);
  steps.push(
    `Новая доля фруктозы: (${fructosePct.toFixed(2)} + ${x.toFixed(4)}) / ${newTotal.toFixed(4)} × 100 = ${newFructose.toFixed(3)}%`
  );
  steps.push(
    `Новая доля глюкозы: ${glucosePct.toFixed(2)} / ${newTotal.toFixed(4)} × 100 = ${newGlucose.toFixed(3)}%`
  );
  steps.push(
    `Новое Ф/Г = ${newFructose.toFixed(3)} / ${newGlucose.toFixed(3)} = ${newRatio.toFixed(4)} ${newRatio >= targetRatio ? "✅" : "❌"}`
  );
  steps.push(
    `На партию ${batchKg} кг → добавить ${((x / 100) * batchKg).toFixed(3)} кг кристаллической фруктозы`
  );

  return {
    currentRatio, targetRatio, status: "low",
    addFructose: (x / 100) * batchKg,
    newFructose, newGlucose, newRatio, steps,
  };
}

function calcDiastase(
  currentDias: number,
  targetDias: number,
  batchKg: number,
  veronActivityPerGram: number
): DiasResult {
  const steps: string[] = [];

  steps.push(`Текущее диастазное число: ${currentDias.toFixed(1)} ед.Готе`);
  steps.push(`Норматив по ГОСТ: ≥ ${targetDias} ед.Готе`);

  if (currentDias >= targetDias) {
    steps.push("✅ Диастазное число соответствует норме — коррекция не требуется.");
    return {
      current: currentDias, target: targetDias, status: "ok",
      addVeron_per100: 0, addVeron_batch: 0,
      newDias: currentDias, steps,
    };
  }

  const deficit = targetDias - currentDias;
  steps.push(`Дефицит: ${targetDias} − ${currentDias.toFixed(1)} = ${deficit.toFixed(2)} ед.Готе`);

  const gPer100 = deficit / veronActivityPerGram;
  const gPer100_safe = gPer100 * 1.1;
  const newDias = currentDias + gPer100_safe * veronActivityPerGram;

  steps.push(
    `Дозировка Верон: 1 г препарата на 100 кг → +${veronActivityPerGram.toFixed(2)} ед.Готе`
  );
  steps.push(
    `Требуемая доза: ${deficit.toFixed(2)} / ${veronActivityPerGram.toFixed(2)} = ${gPer100.toFixed(3)} г/100 кг`
  );
  steps.push(`С запасом 10%: ${gPer100_safe.toFixed(3)} г на 100 кг купажа`);
  steps.push(`На партию ${batchKg} кг: ${((gPer100_safe / 100) * batchKg).toFixed(2)} г препарата Верон`);
  steps.push(
    `Расчётное диастазное число после коррекции: ${newDias.toFixed(2)} ед.Готе ${newDias >= targetDias ? "✅" : "❌"}`
  );
  steps.push(
    `⚠️ Подтвердить методом Шаде (ГОСТ 31694-2012) через 24 ч после купажирования`
  );

  return {
    current: currentDias, target: targetDias, status: "low",
    addVeron_per100: gPer100_safe,
    addVeron_batch: (gPer100_safe / 100) * batchKg,
    newDias, steps,
  };
}

function calcProline(
  currentProline: number,
  targetProline: number,
  batchKg: number,
  prolinePerGramPer100kg: number
): ProlineResult {
  const steps: string[] = [];

  steps.push(`Текущая массовая доля пролина: ${currentProline.toFixed(1)} мг/кг`);
  steps.push(`Норматив по ГОСТ: ≥ ${targetProline} мг/кг`);

  if (currentProline >= targetProline) {
    steps.push("✅ Массовая доля пролина соответствует норме — коррекция не требуется.");
    return {
      current: currentProline, target: targetProline, status: "ok",
      addProline_per100: 0, addProline_batch: 0,
      newProline: currentProline, steps,
    };
  }

  const deficit = targetProline - currentProline;
  steps.push(`Дефицит: ${targetProline} − ${currentProline.toFixed(1)} = ${deficit.toFixed(1)} мг/кг`);

  const gPer100 = deficit / prolinePerGramPer100kg;
  const gPer100_safe = gPer100 * 1.05;
  const newProline = currentProline + gPer100_safe * prolinePerGramPer100kg;

  steps.push(
    `Эффективность Пролин L: 1 г на 100 кг мёда → +${prolinePerGramPer100kg.toFixed(1)} мг/кг пролина`
  );
  steps.push(
    `Расчётная доза: ${deficit.toFixed(1)} / ${prolinePerGramPer100kg.toFixed(1)} = ${gPer100.toFixed(3)} г/100 кг`
  );
  steps.push(`С запасом 5%: ${gPer100_safe.toFixed(3)} г на 100 кг купажа`);
  steps.push(
    `На партию ${batchKg} кг: ${((gPer100_safe / 100) * batchKg).toFixed(2)} г препарата Пролин L`
  );
  steps.push(
    `Расчётная доля пролина после коррекции: ${newProline.toFixed(1)} мг/кг ${newProline >= targetProline ? "✅" : "❌"}`
  );
  steps.push(
    `⚠️ Подтвердить методом ВЭЖХ или колориметрией по ГОСТ через 2 ч после гомогенизации`
  );

  return {
    current: currentProline, target: targetProline, status: "low",
    addProline_per100: gPer100_safe,
    addProline_batch: (gPer100_safe / 100) * batchKg,
    newProline, steps,
  };
}

// ─── Prompt Generator ─────────────────────────────────────────────────────────
function buildPrompt(
  honeyKind: HoneyNorm,
  gostType: GostType,
  glucosePct: number,
  fructosePct: number,
  targetRatio: number,
  batchKg: number,
  productName: string,
  sugarRes: SugarResult,
  diasRes: DiasResult,
  prolineRes: ProlineResult
): string {
  const gostLabel = gostType === "19792" ? "ГОСТ 19792-2017" : "ГОСТ 31766-2012";
  return `# 🍯 ПРОМТ ДЛЯ РАЗРАБОТКИ РЕЦЕПТУРЫ МЕДОВОГО ПРОДУКТА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 👥 КОМАНДА СПЕЦИАЛИСТОВ И ИХ РОЛИ

### 🔬 Главный технолог-рецептуролог
**Задача:** Разработать и валидировать рецептуру купажа, обеспечить соответствие целевым показателям: Ф/Г, диастазное число, пролин.

### 📊 Аналитический химик
**Задача:** ВЭЖХ (сахара, пролин), метод Шаде (диастаза), рефрактометрия. Верифицировать до и после коррекции.

### 🌾 Технолог производства
**Задача:** Регламент купажирования: температуры, порядок внесения (ферменты — последними при T ≤ 40°C).

### 📋 Нормировщик
**Задача:** Соответствие ${gostLabel}, ТР ТС 021/2011, Codex Alimentarius. Оформить НТД.

### 🧪 QC-менеджер
**Задача:** HACCP, контрольные точки по всем трём показателям, hold-точки.

### 📈 Технолог-оптимизатор
**Задача:** Минимизировать расход препаратов, сценарии коррекции, себестоимость.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📌 ИСХОДНЫЕ ДАННЫЕ

**Продукт:** ${productName || "Медовый купажированный продукт"}
**Вид мёда:** ${honeyKind.emoji} ${honeyKind.label}
**Нормативный документ:** ${gostLabel}
**Объём партии:** ${batchKg} кг

| Показатель | Исходное значение | Норматив (${gostLabel}) | Статус |
|-----------|------------------|----------|--------|
| Массовая доля глюкозы | ${glucosePct}% | — | — |
| Массовая доля фруктозы | ${fructosePct}% | — | — |
| Соотношение Ф/Г | ${sugarRes.currentRatio.toFixed(4)} | ≥ ${targetRatio} | ${sugarRes.status === "ok" ? "✅ Норма" : "⚠️ Коррекция"} |
| Диастазное число | ${diasRes.current} ед.Готе | ≥ ${diasRes.target} ед.Готе | ${diasRes.status === "ok" ? "✅ Норма" : "⚠️ Коррекция Верон"} |
| Массовая доля пролина | ${prolineRes.current} мг/кг | ≥ ${prolineRes.target} мг/кг | ${prolineRes.status === "ok" ? "✅ Норма" : "⚠️ Коррекция Пролин L"} |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🧮 РАСЧЁТ КОРРЕКЦИИ

### 1. Соотношение Ф/Г
${sugarRes.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

### 2. Диастазное число (фермент Верон)
${diasRes.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

### 3. Массовая доля пролина (препарат Пролин L)
${prolineRes.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📐 СВОДНАЯ РЕЦЕПТУРНАЯ КАРТА (на ${batchKg} кг купажа)

| Компонент | Назначение | На 100 кг базы | На ${batchKg} кг |
|-----------|-----------|----------------|-----------------|
| Базовый мёд/купаж | Основа | 100,000 кг | ${batchKg.toFixed(3)} кг |
| Фруктоза кристаллическая (≥99%) | Коррекция Ф/Г | ${sugarRes.addFructose > 0 ? ((sugarRes.addFructose / batchKg) * 100).toFixed(4) : "0,0000"} кг | ${sugarRes.addFructose.toFixed(4)} кг |
| Верон (диастазный препарат) | Коррекция диастазы | ${diasRes.addVeron_per100 > 0 ? diasRes.addVeron_per100.toFixed(3) : "0,000"} г | ${diasRes.addVeron_batch > 0 ? diasRes.addVeron_batch.toFixed(2) : "0,00"} г |
| Пролин L (L-пролин ≥98%) | Коррекция пролина | ${prolineRes.addProline_per100 > 0 ? prolineRes.addProline_per100.toFixed(3) : "0,000"} г | ${prolineRes.addProline_batch > 0 ? prolineRes.addProline_batch.toFixed(2) : "0,00"} г |

**Итого после коррекции:**
- Ф/Г: **${sugarRes.newRatio.toFixed(4)}** ${sugarRes.newRatio >= targetRatio ? "✅" : "❌"}
- Диастазное число: **${diasRes.newDias.toFixed(2)} ед.Готе** ${diasRes.newDias >= diasRes.target ? "✅" : "❌"}
- Пролин: **${prolineRes.newProline.toFixed(1)} мг/кг** ${prolineRes.newProline >= prolineRes.target ? "✅" : "❌"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ⚠️ КРИТИЧЕСКИЕ ПРЕДУПРЕЖДЕНИЯ

1. **Перегрев = уничтожение диастазы:** T > 50°C необратимо денатурирует ферменты — Верон вносить при T ≤ 40°C
2. **Порядок строго соблюдать:** фруктоза → пролин → Верон (последним)
3. **Аналитика обязательна:** все три показателя подтвердить инструментально
4. **Активность Верон:** строго по COA партии — пересчитайте дозу по фактической активности
5. **Норматив ${gostLabel}:** диастаза ≥ ${diasRes.target} ед.Готе, пролин ≥ ${prolineRes.target} мг/кг (${honeyKind.label})

## 🎯 ИТОГОВОЕ ЗАДАНИЕ ДЛЯ AI / КОМАНДЫ

1. **[Аналитик]** Подтвердите исходный состав, рассчитайте неопределённость по всем показателям
2. **[Технолог]** Утвердите рецептурную карту, оцените взаимовлияние добавок
3. **[Нормировщик]** Проверьте соответствие ${gostLabel}, ТР ТС — оформите декларацию
4. **[QC]** Утвердите план контроля, определите hold-точки
5. **[Оптимизатор]** Сценарии коррекции с экономическим сравнением

**Результат:** готовая НТД (рецептура + регламент + план контроля + декларация соответствия) для серийного производства ${honeyKind.emoji} ${honeyKind.label}.`;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {children}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md border border-amber-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

function NumberInput({
  label, value, onChange, unit, min, max, step, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; min?: number; max?: number; step?: number; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <div className="relative">
        <input
          type="number" value={value} min={min} max={max} step={step ?? 0.01}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 pr-14 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">{unit}</span>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ ok, okLabel = "✅ Норма", badLabel = "⚠️ Коррекция" }: { ok: boolean; okLabel?: string; badLabel?: string }) {
  return ok
    ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">{okLabel}</span>
    : <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">{badLabel}</span>;
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-1.5">
      {steps.map((step, i) => (
        <div
          key={i}
          className={`flex gap-2.5 p-2.5 rounded-xl text-sm ${
            step.includes("✅")
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : step.includes("❌")
              ? "bg-red-50 border border-red-200 text-red-800"
              : step.includes("⚠️")
              ? "bg-orange-50 border border-orange-200 text-orange-800"
              : "bg-slate-50 border border-slate-200 text-slate-700"
          }`}
        >
          <span className="font-bold text-slate-400 shrink-0 w-5 text-right text-xs pt-0.5">{i + 1}.</span>
          <span className="font-mono leading-relaxed text-xs">{step}</span>
        </div>
      ))}
    </div>
  );
}

// Легенда для статусов
function LegendBlock() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="text-xs font-bold text-slate-600 mb-1">📖 Расшифровка статусов:</p>
      <div className="space-y-1.5 text-xs text-slate-600">
        <div className="flex items-start gap-2">
          <span className="shrink-0 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 text-xs">✅ Норма</span>
          <span>Показатель <strong>соответствует нормативу</strong> по выбранному ГОСТ. Коррекция не нужна.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5 text-xs">⚠️ Коррекция</span>
          <span>Показатель <strong>ниже норматива</strong>. Необходимо добавить корректирующий компонент (фруктоза / Верон / Пролин L) в количестве, рассчитанном в соответствующей вкладке.</span>
        </div>
        <div className="flex items-start gap-2 mt-1">
          <span className="shrink-0 text-base">✅</span>
          <span>В пошаговом расчёте — расчётное значение <strong>достигнуто</strong>.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-base">❌</span>
          <span>В пошаговом расчёте — расчётное значение <strong>не достигнуто</strong> (проверьте введённые параметры препарата).</span>
        </div>
      </div>
    </div>
  );
}

// Справочная таблица нормативов для выбранного вида мёда
function NormsReference({ norm, gostType }: { norm: HoneyNorm; gostType: GostType }) {
  const diasMin = gostType === "19792" ? norm.diasMin_19792 : norm.diasMin_31766;
  const prolineMin = gostType === "19792" ? norm.prolineMin_19792 : norm.prolineMin_31766;
  const gostLabel = gostType === "19792" ? "ГОСТ 19792-2017" : "ГОСТ 31766-2012";

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{norm.emoji}</span>
        <div>
          <p className="text-sm font-bold text-amber-900">{norm.label}</p>
          <p className="text-xs text-amber-600">{gostLabel}</p>
        </div>
      </div>
      {norm.note && (
        <p className="text-xs text-amber-700 italic border-l-2 border-amber-300 pl-2">{norm.note}</p>
      )}
      <div className="grid grid-cols-1 gap-1.5 mt-2">
        {[
          {
            icon: "🍬",
            label: "Ф/Г",
            value: `≥ ${norm.fgMin}`,
            note: "для всех видов мёда",
            color: "text-amber-700",
          },
          {
            icon: "🔬",
            label: "Диастаза",
            value: `≥ ${diasMin} ед.Готе`,
            note: gostLabel,
            color: "text-blue-700",
          },
          {
            icon: "🧬",
            label: "Пролин",
            value: `≥ ${prolineMin} мг/кг`,
            note: gostLabel,
            color: "text-purple-700",
          },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between bg-white/70 rounded-lg px-2.5 py-1.5 border border-amber-100">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <span>{row.icon}</span>
              <span>{row.label}</span>
            </span>
            <div className="text-right">
              <span className={`text-xs font-bold font-mono ${row.color}`}>{row.value}</span>
              <span className="text-xs text-slate-400 ml-1">({row.note})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Полная таблица всех нормативов
function FullNormsTable({ gostType }: { gostType: GostType }) {
  const gostLabel = gostType === "19792" ? "ГОСТ 19792-2017" : "ГОСТ 31766-2012";
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
        <span>📚</span> Справочник нормативов — {gostLabel}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-amber-100 to-yellow-100 text-slate-700">
              <th className="text-left px-3 py-2.5 rounded-l-lg">Вид мёда</th>
              <th className="text-center px-3 py-2.5">Ф/Г мин.</th>
              <th className="text-center px-3 py-2.5">Диастаза, ед.Готе</th>
              <th className="text-center px-3 py-2.5 rounded-r-lg">Пролин, мг/кг</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {HONEY_NORMS.map((n) => {
              const dias = gostType === "19792" ? n.diasMin_19792 : n.diasMin_31766;
              const proline = gostType === "19792" ? n.prolineMin_19792 : n.prolineMin_31766;
              return (
                <tr key={n.id} className="hover:bg-amber-50/50">
                  <td className="px-3 py-2 font-medium text-slate-700">
                    <span className="mr-1">{n.emoji}</span>{n.label}
                  </td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-amber-700">≥ {n.fgMin}</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-blue-700">≥ {dias}</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-purple-700">≥ {proline}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-200 space-y-1">
        <p>📌 <strong>ГОСТ 19792-2017</strong> — нормы для всех видов мёда по пролину единые (≥ 180 мг/кг)</p>
        <p>📌 <strong>ГОСТ 31766-2012</strong> — пролин дифференцирован по видам мёда (180–300 мг/кг)</p>
        <p>📌 Соотношение Ф/Г ≥ 1,1 является единым для всех видов по обоим ГОСТ</p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
type Tab = "sugar" | "diastase" | "proline" | "summary" | "norms" | "prompt";

export default function App() {
  // Honey kind & GOST
  const [honeyKindId, setHoneyKindId] = useState<HoneyKind>("floral");
  const [gostType, setGostType] = useState<GostType>("19792");

  const honeyKind = HONEY_NORMS.find((n) => n.id === honeyKindId)!;

  // Sugar inputs
  const [glucosePct, setGlucosePct] = useState(48.5);
  const [fructosePct, setFructosePct] = useState(25.26);
  const [targetRatio, setTargetRatio] = useState(1.1);

  // Diastase inputs
  const [currentDias, setCurrentDias] = useState(5.2);
  const [targetDias, setTargetDias] = useState(8.0);
  const [veronActivity, setVeronActivity] = useState(0.5);

  // Proline inputs
  const [currentProline, setCurrentProline] = useState(120.0);
  const [targetProline, setTargetProline] = useState(180.0);
  const [prolineEff, setProlineEff] = useState(9.8);

  // Common
  const [batchKg, setBatchKg] = useState(1000);
  const [productName, setProductName] = useState("Мёд купажированный «Премиум»");
  const [activeTab, setActiveTab] = useState<Tab>("sugar");
  const [copied, setCopied] = useState(false);

  // When honey kind or GOST changes — update target norms automatically
  useEffect(() => {
    const norm = HONEY_NORMS.find((n) => n.id === honeyKindId)!;
    const dias = gostType === "19792" ? norm.diasMin_19792 : norm.diasMin_31766;
    const proline = gostType === "19792" ? norm.prolineMin_19792 : norm.prolineMin_31766;
    setTargetDias(dias);
    setTargetProline(proline);
    setTargetRatio(norm.fgMin);
  }, [honeyKindId, gostType]);

  // Results
  const sugarRes = useCallback(
    () => calcSugars(glucosePct, fructosePct, targetRatio, batchKg),
    [glucosePct, fructosePct, targetRatio, batchKg]
  )();

  const diasRes = useCallback(
    () => calcDiastase(currentDias, targetDias, batchKg, veronActivity),
    [currentDias, targetDias, batchKg, veronActivity]
  )();

  const prolineRes = useCallback(
    () => calcProline(currentProline, targetProline, batchKg, prolineEff),
    [currentProline, targetProline, batchKg, prolineEff]
  )();

  const prompt = buildPrompt(
    honeyKind, gostType, glucosePct, fructosePct, targetRatio,
    batchKg, productName, sugarRes, diasRes, prolineRes
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const allOk = sugarRes.status === "ok" && diasRes.status === "ok" && prolineRes.status === "ok";

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "sugar", label: "Ф/Г", icon: "🍬" },
    { id: "diastase", label: "Диастаза", icon: "🔬" },
    { id: "proline", label: "Пролин", icon: "🧬" },
    { id: "summary", label: "Сводная", icon: "📐" },
    { id: "norms", label: "Нормативы", icon: "📚" },
    { id: "prompt", label: "AI Промт", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-3xl">🍯</span>
          <div>
            <h1 className="text-lg font-bold text-amber-900 leading-tight">Honey Formula Lab</h1>
            <p className="text-xs text-amber-600">Рецептурный калькулятор · Ф/Г · Диастаза · Пролин · ГОСТ 19792 / 31766</p>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap items-center">
            <span className="text-sm font-semibold text-amber-800">{honeyKind.emoji} {honeyKind.label}</span>
            <Badge color="bg-amber-100 text-amber-800">Ф/Г</Badge>
            <Badge color="bg-blue-100 text-blue-800">Верон</Badge>
            <Badge color="bg-purple-100 text-purple-800">Пролин L</Badge>
            <Badge color={allOk ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>
              {allOk ? "✅ Всё в норме" : "⚠️ Нужна коррекция"}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left sidebar: inputs ── */}
        <aside className="lg:col-span-4 space-y-4">

          {/* Honey Kind & GOST selector */}
          <Card>
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>🍯</span> Вид мёда и нормативный документ
            </h2>
            <div className="space-y-3">
              {/* Honey kind */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Вид мёда</label>
                <p className="text-xs text-slate-400">Нормативы диастазы и пролина подставятся автоматически</p>
                <select
                  value={honeyKindId}
                  onChange={(e) => setHoneyKindId(e.target.value as HoneyKind)}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                >
                  {HONEY_NORMS.map((n) => (
                    <option key={n.id} value={n.id}>{n.emoji} {n.label}</option>
                  ))}
                </select>
              </div>
              {/* GOST */}
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Нормативный документ</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["19792", "31766"] as GostType[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGostType(g)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        gostType === g
                          ? "bg-amber-400 text-white border-amber-400 shadow"
                          : "bg-white text-slate-600 border-amber-200 hover:border-amber-400"
                      }`}
                    >
                      ГОСТ {g === "19792" ? "19792-2017" : "31766-2012"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Reference norms */}
              <NormsReference norm={honeyKind} gostType={gostType} />
            </div>
          </Card>

          {/* Product & batch */}
          <Card>
            <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>⚙️</span> Параметры партии
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Название продукта</label>
                <input
                  type="text" value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                />
              </div>
              <NumberInput
                label="Объём партии" value={batchKg} onChange={setBatchKg}
                unit="кг" min={1} max={100000} step={10}
                hint="Общий объём купажируемой партии"
              />
            </div>
          </Card>

          {/* Sugar inputs */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span>🍬</span> Соотношение Ф/Г
              </h2>
              <StatusBadge ok={sugarRes.status === "ok"} />
            </div>
            <div className="space-y-3">
              <NumberInput label="Массовая доля глюкозы" value={glucosePct} onChange={setGlucosePct} unit="%" min={0} max={100} step={0.01} hint="Исходный показатель" />
              <NumberInput label="Массовая доля фруктозы" value={fructosePct} onChange={setFructosePct} unit="%" min={0} max={100} step={0.01} hint="Исходный показатель" />
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Целевое соотношение Ф/Г</label>
                <p className="text-xs text-slate-400">Автоподстановка из норматива (≥ 1,1 по ГОСТ)</p>
                <div className="relative">
                  <input
                    type="number" value={targetRatio} min={0.5} max={5} step={0.01}
                    onChange={(e) => setTargetRatio(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-amber-200 bg-amber-50/40 px-3 py-2.5 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-xs text-slate-500 mb-0.5">Текущее Ф/Г</p>
                <p className={`text-lg font-bold font-mono ${sugarRes.currentRatio >= targetRatio ? "text-emerald-600" : "text-red-500"}`}>
                  {sugarRes.currentRatio.toFixed(3)}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-xs text-slate-500 mb-0.5">Добавить фруктозы</p>
                <p className="text-lg font-bold font-mono text-orange-600">
                  {sugarRes.addFructose > 0 ? sugarRes.addFructose.toFixed(2) + " кг" : "—"}
                </p>
              </div>
            </div>
          </Card>

          {/* Diastase inputs */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span>🔬</span> Диастазное число
              </h2>
              <StatusBadge ok={diasRes.status === "ok"} />
            </div>
            <div className="space-y-3">
              <NumberInput
                label="Текущее диастазное число" value={currentDias}
                onChange={setCurrentDias} unit="ед.Готе" min={0} max={50} step={0.1}
                hint="Исходный показатель купажа"
              />
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Норматив (целевое)</label>
                <p className="text-xs text-slate-400">Автоподстановка по виду мёда и ГОСТ</p>
                <div className="relative">
                  <input
                    type="number" value={targetDias} min={1} max={50} step={0.1}
                    onChange={(e) => setTargetDias(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-blue-200 bg-blue-50/40 px-3 py-2.5 pr-16 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">ед.Готе</span>
                </div>
              </div>
              <NumberInput
                label="Активность Верон" value={veronActivity}
                onChange={setVeronActivity} step={0.01} min={0.01} max={10}
                hint="ед.Готе на 1 г препарата на 100 кг мёда (по COA)"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-xs text-slate-500 mb-0.5">Добавить Верон</p>
                <p className="text-lg font-bold font-mono text-blue-600">
                  {diasRes.addVeron_batch > 0 ? diasRes.addVeron_batch.toFixed(1) + " г" : "—"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-xs text-slate-500 mb-0.5">На 100 кг</p>
                <p className="text-lg font-bold font-mono text-blue-600">
                  {diasRes.addVeron_per100 > 0 ? diasRes.addVeron_per100.toFixed(2) + " г" : "—"}
                </p>
              </div>
            </div>
          </Card>

          {/* Proline inputs */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span>🧬</span> Пролин
              </h2>
              <StatusBadge ok={prolineRes.status === "ok"} />
            </div>
            <div className="space-y-3">
              <NumberInput
                label="Текущая доля пролина" value={currentProline}
                onChange={setCurrentProline} unit="мг/кг" min={0} max={5000} step={1}
                hint="Исходный показатель купажа"
              />
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">Норматив (целевое)</label>
                <p className="text-xs text-slate-400">Автоподстановка по виду мёда и ГОСТ</p>
                <div className="relative">
                  <input
                    type="number" value={targetProline} min={1} max={5000} step={1}
                    onChange={(e) => setTargetProline(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-purple-200 bg-purple-50/40 px-3 py-2.5 pr-16 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">мг/кг</span>
                </div>
              </div>
              <NumberInput
                label="Эффективность Пролин L" value={prolineEff}
                onChange={setProlineEff} unit="мг/кг" min={1} max={100} step={0.1}
                hint="мг/кг пролина от 1 г препарата на 100 кг (по COA)"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-xs text-slate-500 mb-0.5">Добавить Пролин L</p>
                <p className="text-lg font-bold font-mono text-purple-600">
                  {prolineRes.addProline_batch > 0 ? prolineRes.addProline_batch.toFixed(1) + " г" : "—"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
                <p className="text-xs text-slate-500 mb-0.5">На 100 кг</p>
                <p className="text-lg font-bold font-mono text-purple-600">
                  {prolineRes.addProline_per100 > 0 ? prolineRes.addProline_per100.toFixed(2) + " г" : "—"}
                </p>
              </div>
            </div>
          </Card>

          {/* Legend always visible */}
          <LegendBlock />
        </aside>

        {/* ── Right panel: tabs ── */}
        <main className="lg:col-span-8 space-y-4">

          {/* Tab switcher */}
          <div className="flex gap-1.5 bg-white rounded-2xl p-1.5 shadow-sm border border-amber-100 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[80px] py-2 px-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-amber-400 text-white shadow"
                    : "text-slate-500 hover:text-slate-800 hover:bg-amber-50"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB: Sugar ── */}
          {activeTab === "sugar" && (
            <Card>
              <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span>🍬</span> Расчёт коррекции соотношения Ф/Г
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Норматив: Ф/Г ≥ {targetRatio} — для {honeyKind.emoji} {honeyKind.label} ({gostType === "19792" ? "ГОСТ 19792-2017" : "ГОСТ 31766-2012"})
              </p>

              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>Метод:</strong> Добавление кристаллической фруктозы (≥99%) к купажу до достижения Ф/Г ≥ {targetRatio}.
                Расчёт учитывает изменение суммарной массы купажа после добавления фруктозы.
              </div>

              <StepList steps={sugarRes.steps} />

              <div className="mt-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">📐 Рецептурная карта — Соотношение Ф/Г</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-amber-100 text-amber-900">
                        <th className="text-left px-3 py-2 rounded-l-lg">Компонент</th>
                        <th className="text-right px-3 py-2">На 100 кг</th>
                        <th className="text-right px-3 py-2 rounded-r-lg">На {batchKg} кг</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50">
                      <tr className="hover:bg-amber-50/50">
                        <td className="px-3 py-2.5 text-slate-700 font-medium">🍯 Базовый купаж</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">100,0000 кг</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{batchKg.toFixed(3)} кг</td>
                      </tr>
                      <tr className="hover:bg-amber-50/50">
                        <td className="px-3 py-2.5 text-slate-700 font-medium">🍬 Фруктоза кристаллическая (≥99%)</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-orange-600">
                          {sugarRes.addFructose > 0 ? ((sugarRes.addFructose / batchKg) * 100).toFixed(4) : "0,0000"} кг
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-orange-600">
                          {sugarRes.addFructose > 0 ? sugarRes.addFructose.toFixed(4) : "0,0000"} кг
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-gradient-to-r from-amber-100 to-orange-100 font-bold">
                        <td className="px-3 py-2.5 rounded-l-lg text-slate-800">ИТОГО</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-800">
                          {(100 + (sugarRes.addFructose > 0 ? (sugarRes.addFructose / batchKg) * 100 : 0)).toFixed(4)} кг
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-800 rounded-r-lg">
                          {(batchKg + sugarRes.addFructose).toFixed(3)} кг
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: "Фруктоза (после)", val: sugarRes.newFructose.toFixed(3) + "%", color: "text-orange-600" },
                    { label: "Глюкоза (после)", val: sugarRes.newGlucose.toFixed(3) + "%", color: "text-blue-600" },
                    { label: "Ф/Г (после)", val: sugarRes.newRatio.toFixed(4), color: sugarRes.newRatio >= targetRatio ? "text-emerald-600" : "text-red-500" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white border border-amber-100 rounded-xl p-3 text-center shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className={`text-base font-bold font-mono ${item.color}`}>{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB: Diastase ── */}
          {activeTab === "diastase" && (
            <Card>
              <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span>🔬</span> Расчёт коррекции диастазного числа (препарат Верон)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Норматив: ≥ {targetDias} ед.Готе — для {honeyKind.emoji} {honeyKind.label} ({gostType === "19792" ? "ГОСТ 19792-2017" : "ГОСТ 31766-2012"})
              </p>

              {/* What is diastase */}
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                <p className="font-bold">🔬 Что такое диастазное число?</p>
                <p>Диастаза (амилаза) — фермент мёда, расщепляющий крахмал. <strong>Низкое диастазное число</strong> может указывать на:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1 text-blue-800">
                  <li><strong>Перегрев мёда</strong> — термообработка выше 50°C необратимо денатурирует ферменты</li>
                  <li><strong>Кормление пчёл сахаром</strong> — продукт не является натуральным мёдом в полном смысле</li>
                  <li><strong>Фальсификацию</strong> — разбавление сахарными сиропами</li>
                </ul>
                <p className="mt-1"><strong>Препарат:</strong> Верон — вносится <strong>последним</strong>, при T ≤ 40°C. Расчёт включает запас 10%.</p>
              </div>

              <StepList steps={diasRes.steps} />

              <div className="mt-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">📐 Рецептурная карта — Диастаза (Верон)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-100 text-blue-900">
                        <th className="text-left px-3 py-2 rounded-l-lg">Параметр</th>
                        <th className="text-right px-3 py-2">На 100 кг</th>
                        <th className="text-right px-3 py-2 rounded-r-lg">На {batchKg} кг</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50">
                      <tr className="hover:bg-blue-50/50">
                        <td className="px-3 py-2.5 text-slate-700 font-medium">🔵 Верон (ферментный препарат)</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-600">
                          {diasRes.addVeron_per100 > 0 ? diasRes.addVeron_per100.toFixed(3) : "0,000"} г
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-blue-600">
                          {diasRes.addVeron_batch > 0 ? diasRes.addVeron_batch.toFixed(2) : "0,00"} г
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: "Диастаза (текущая)", val: diasRes.current.toFixed(1) + " ед.", color: diasRes.current >= diasRes.target ? "text-emerald-600" : "text-red-500" },
                    { label: "Диастаза (расчётная)", val: diasRes.newDias.toFixed(2) + " ед.", color: diasRes.newDias >= diasRes.target ? "text-emerald-600" : "text-red-500" },
                    { label: "Норматив", val: "≥ " + diasRes.target.toFixed(1) + " ед.", color: "text-slate-600" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white border border-blue-100 rounded-xl p-3 text-center shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className={`text-base font-bold font-mono ${item.color}`}>{item.val}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
                  <strong>⚠️ Важно:</strong> Верон вносить строго при T ≤ 40°C. Активность по COA конкретной партии может отличаться — скорректируйте поле «Активность Верон» слева.
                  Финальное значение определить методом Шаде (ГОСТ 31694-2012) через 24 ч после купажирования.
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB: Proline ── */}
          {activeTab === "proline" && (
            <Card>
              <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span>🧬</span> Расчёт коррекции пролина (препарат Пролин L)
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Норматив: ≥ {targetProline} мг/кг — для {honeyKind.emoji} {honeyKind.label} ({gostType === "19792" ? "ГОСТ 19792-2017" : "ГОСТ 31766-2012"})
              </p>

              <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900 space-y-1">
                <p className="font-bold">🧬 Что такое пролин в мёде?</p>
                <p>L-пролин — аминокислота, которую пчёлы выделяют в нектар при его переработке в мёд. Показатель пролина используется как маркер натуральности и зрелости мёда.</p>
                <p><strong>Препарат Пролин L</strong> — чистота ≥98%, добавляется при T ≤ 42°C. Расчёт включает запас 5%.</p>
              </div>

              <StepList steps={prolineRes.steps} />

              <div className="mt-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">📐 Рецептурная карта — Пролин (Пролин L)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-100 text-purple-900">
                        <th className="text-left px-3 py-2 rounded-l-lg">Параметр</th>
                        <th className="text-right px-3 py-2">На 100 кг</th>
                        <th className="text-right px-3 py-2 rounded-r-lg">На {batchKg} кг</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-50">
                      <tr className="hover:bg-purple-50/50">
                        <td className="px-3 py-2.5 text-slate-700 font-medium">🟣 Пролин L (L-пролин ≥98%)</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-purple-600">
                          {prolineRes.addProline_per100 > 0 ? prolineRes.addProline_per100.toFixed(3) : "0,000"} г
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-purple-600">
                          {prolineRes.addProline_batch > 0 ? prolineRes.addProline_batch.toFixed(2) : "0,00"} г
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: "Пролин (текущий)", val: prolineRes.current.toFixed(1) + " мг/кг", color: prolineRes.current >= prolineRes.target ? "text-emerald-600" : "text-red-500" },
                    { label: "Пролин (расчётный)", val: prolineRes.newProline.toFixed(1) + " мг/кг", color: prolineRes.newProline >= prolineRes.target ? "text-emerald-600" : "text-red-500" },
                    { label: "Норматив", val: "≥ " + prolineRes.target + " мг/кг", color: "text-slate-600" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white border border-purple-100 rounded-xl p-3 text-center shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                      <p className={`text-base font-bold font-mono ${item.color}`}>{item.val}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-800">
                  <strong>⚠️ Важно:</strong> Расчёт на основе введённой эффективности ({prolineEff} мг/кг на 1 г/100 кг).
                  Уточните по COA конкретной партии Пролин L.
                  Финальное значение — ВЭЖХ или колориметрия по ГОСТ через 2 ч после гомогенизации.
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB: Summary ── */}
          {activeTab === "summary" && (
            <Card>
              <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span>📐</span> Сводная рецептурная карта купажа
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                {honeyKind.emoji} {honeyKind.label} · {gostType === "19792" ? "ГОСТ 19792-2017" : "ГОСТ 31766-2012"} · Партия {batchKg} кг
              </p>

              {/* Overall status */}
              <div className={`mb-4 rounded-xl p-3 border text-sm font-medium ${
                allOk ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-orange-50 border-orange-200 text-orange-800"
              }`}>
                {allOk
                  ? "✅ Все показатели соответствуют норме — коррекция не требуется"
                  : "⚠️ Требуется коррекция по одному или нескольким показателям. Используйте данные ниже."}
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {[
                  {
                    icon: "🍬", label: "Соотношение Ф/Г",
                    current: sugarRes.currentRatio.toFixed(3),
                    after: sugarRes.newRatio.toFixed(4),
                    norm: "≥ " + targetRatio,
                    ok: sugarRes.newRatio >= targetRatio,
                    accentColor: "amber",
                  },
                  {
                    icon: "🔬", label: "Диастазное число",
                    current: diasRes.current.toFixed(1) + " ед.",
                    after: diasRes.newDias.toFixed(2) + " ед.",
                    norm: "≥ " + diasRes.target + " ед.",
                    ok: diasRes.newDias >= diasRes.target,
                    accentColor: "blue",
                  },
                  {
                    icon: "🧬", label: "Пролин",
                    current: prolineRes.current.toFixed(1) + " мг/кг",
                    after: prolineRes.newProline.toFixed(1) + " мг/кг",
                    norm: "≥ " + prolineRes.target + " мг/кг",
                    ok: prolineRes.newProline >= prolineRes.target,
                    accentColor: "purple",
                  },
                ].map((item) => (
                  <div key={item.label} className={`rounded-xl border p-3 bg-${item.accentColor}-50 border-${item.accentColor}-200`}>
                    <p className="text-xs font-bold text-slate-600 mb-2">{item.icon} {item.label}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Исходное:</span>
                        <span className="font-mono font-bold text-slate-700">{item.current}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">После коррекции:</span>
                        <span className={`font-mono font-bold ${item.ok ? "text-emerald-600" : "text-red-500"}`}>{item.after}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Норматив:</span>
                        <span className="font-mono text-slate-600">{item.norm}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <StatusBadge ok={item.ok} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Master recipe table */}
              <h3 className="text-sm font-bold text-slate-700 mb-3">📋 Полная рецептурная карта</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-100 to-orange-100 text-slate-800">
                      <th className="text-left px-3 py-2.5 rounded-l-lg">Компонент</th>
                      <th className="text-center px-3 py-2.5">Назначение</th>
                      <th className="text-right px-3 py-2.5">На 100 кг</th>
                      <th className="text-right px-3 py-2.5 rounded-r-lg">На {batchKg} кг</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-50">
                    <tr className="hover:bg-amber-50/40">
                      <td className="px-3 py-3 text-slate-700 font-semibold">🍯 Базовый мёд / купаж</td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">Основа</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">100,0000 кг</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">{batchKg.toFixed(3)} кг</td>
                    </tr>
                    <tr className={`hover:bg-amber-50/40 ${sugarRes.addFructose === 0 ? "opacity-40" : ""}`}>
                      <td className="px-3 py-3 text-slate-700 font-medium">
                        🍬 Фруктоза кристаллическая (≥99%)
                        {sugarRes.addFructose === 0 && <span className="ml-2 text-xs text-emerald-600">не требуется ✅</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">Коррекция Ф/Г</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-orange-600">
                        {sugarRes.addFructose > 0 ? ((sugarRes.addFructose / batchKg) * 100).toFixed(4) : "0,0000"} кг
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-orange-600">
                        {sugarRes.addFructose > 0 ? sugarRes.addFructose.toFixed(4) : "0,0000"} кг
                      </td>
                    </tr>
                    <tr className={`hover:bg-blue-50/40 ${diasRes.addVeron_batch === 0 ? "opacity-40" : ""}`}>
                      <td className="px-3 py-3 text-slate-700 font-medium">
                        🔵 Верон (диастазный фермент)
                        {diasRes.addVeron_batch === 0 && <span className="ml-2 text-xs text-emerald-600">не требуется ✅</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">Коррекция диастазы</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-blue-600">
                        {diasRes.addVeron_per100 > 0 ? diasRes.addVeron_per100.toFixed(3) : "0,000"} г
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-blue-600">
                        {diasRes.addVeron_batch > 0 ? diasRes.addVeron_batch.toFixed(2) : "0,00"} г
                      </td>
                    </tr>
                    <tr className={`hover:bg-purple-50/40 ${prolineRes.addProline_batch === 0 ? "opacity-40" : ""}`}>
                      <td className="px-3 py-3 text-slate-700 font-medium">
                        🟣 Пролин L (L-пролин ≥98%)
                        {prolineRes.addProline_batch === 0 && <span className="ml-2 text-xs text-emerald-600">не требуется ✅</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-slate-500">Коррекция пролина</td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-purple-600">
                        {prolineRes.addProline_per100 > 0 ? prolineRes.addProline_per100.toFixed(3) : "0,000"} г
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-purple-600">
                        {prolineRes.addProline_batch > 0 ? prolineRes.addProline_batch.toFixed(2) : "0,00"} г
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Order of operations */}
              <div className="mt-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">⚙️ Порядок внесения компонентов</h3>
                <div className="space-y-2">
                  {[
                    { n: 1, icon: "🍬", text: "Фруктоза кристаллическая", temp: "48–50°C", time: "15–20 мин", color: "border-amber-300 bg-amber-50" },
                    { n: 2, icon: "🍯", text: "Купажирование с основной массой мёда", temp: "38–42°C", time: "30–40 мин", color: "border-orange-300 bg-orange-50" },
                    { n: 3, icon: "🟣", text: "Пролин L (растворить в малом объёме мёда)", temp: "≤ 42°C", time: "20 мин", color: "border-purple-300 bg-purple-50" },
                    { n: 4, icon: "🔵", text: "Верон (растворить отдельно, вносить последним)", temp: "≤ 40°C", time: "15–20 мин", color: "border-blue-300 bg-blue-50" },
                    { n: 5, icon: "⏳", text: "Выдержка для стабилизации ферментной активности", temp: "20–25°C", time: "12–24 ч", color: "border-slate-300 bg-slate-50" },
                  ].map((step) => (
                    <div key={step.n} className={`flex items-center gap-3 p-3 rounded-xl border ${step.color}`}>
                      <span className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">{step.n}</span>
                      <span className="text-lg shrink-0">{step.icon}</span>
                      <span className="text-sm text-slate-700 font-medium flex-1">{step.text}</span>
                      <span className="text-xs text-slate-500 font-mono bg-white/60 px-2 py-0.5 rounded-lg border">{step.temp}</span>
                      <span className="text-xs text-slate-500 font-mono bg-white/60 px-2 py-0.5 rounded-lg border">{step.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* QC table */}
              <div className="mt-5">
                <h3 className="text-sm font-bold text-slate-700 mb-3">🔍 Контроль качества</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="text-left px-3 py-2 rounded-l-lg">Показатель</th>
                        <th className="text-center px-3 py-2">Метод</th>
                        <th className="text-center px-3 py-2">Норматив</th>
                        <th className="text-center px-3 py-2">Этап</th>
                        <th className="text-center px-3 py-2 rounded-r-lg">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { name: "Соотношение Ф/Г", method: "ВЭЖХ", norm: "≥ " + targetRatio, stage: "Выходной", ok: sugarRes.newRatio >= targetRatio },
                        { name: "Диастазное число", method: "Метод Шаде (ГОСТ 31694)", norm: "≥ " + diasRes.target + " ед.Готе", stage: "После 24 ч", ok: diasRes.newDias >= diasRes.target },
                        { name: "Массовая доля пролина", method: "ВЭЖХ / колориметрия", norm: "≥ " + prolineRes.target + " мг/кг", stage: "Выходной", ok: prolineRes.newProline >= prolineRes.target },
                        { name: "Влажность", method: "Рефрактометр", norm: "≤ 18,5%", stage: "Входной", ok: true },
                        { name: "HMF", method: "ВЭЖХ / фотометр", norm: "≤ 40 мг/кг", stage: "Выходной", ok: true },
                        { name: "Температура (Верон)", method: "Термометр", norm: "≤ 40°C", stage: "Процессный", ok: true },
                      ].map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700 font-medium">{row.name}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{row.method}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-600">{row.norm}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{row.stage}</td>
                          <td className="px-3 py-2 text-center">
                            <StatusBadge ok={row.ok} okLabel="✅ OK" badLabel="⚠️ Коррекция" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          )}

          {/* ── TAB: Norms ── */}
          {activeTab === "norms" && (
            <div className="space-y-4">
              <Card>
                <FullNormsTable gostType={gostType} />
              </Card>

              <Card>
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <span>📖</span> Пояснения к нормативам
                </h3>
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-amber-800">🍬 Соотношение фруктозы к глюкозе (Ф/Г)</p>
                    <p>Норматив ≥ 1,1 является единым для всех видов мёда по <strong>ГОСТ 19792-2017</strong> и <strong>ГОСТ 31766-2012</strong>. Соотношение отражает ботаническое происхождение мёда. Значение ниже 1,1 может указывать на добавление глюкозного сиропа или фальсификацию.</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-blue-800">🔬 Диастазное число (активность амилазы)</p>
                    <p>Фермент, расщепляющий крахмал. Норма дифференцирована по видам мёда. Самая высокая норма — у <strong>гречишного (≥18 ед.Готе)</strong>, самая низкая — у <strong>акациевого (≥5 ед.Готе)</strong> — это природная особенность, а не признак фальсификации. Низкое диастазное число у других видов мёда — признак перегрева или кормления пчёл сахаром. Метод определения: Шаде (ГОСТ 31694-2012).</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-purple-800">🧬 Массовая доля пролина</p>
                    <p><strong>ГОСТ 19792-2017</strong>: единая норма ≥ 180 мг/кг для всех видов.</p>
                    <p><strong>ГОСТ 31766-2012</strong>: дифференцировано — от 180 мг/кг (акациевый, липовый) до 300 мг/кг (каштановый). Пролин — аминокислота, которую пчёлы вносят при переработке нектара. Низкое содержание = незрелый мёд или разбавление сахарным сиропом.</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                    <p className="font-bold text-slate-700">📋 Выбор нормативного документа</p>
                    <ul className="list-disc list-inside space-y-0.5 ml-1">
                      <li><strong>ГОСТ 19792-2017</strong> — актуальный межгосударственный стандарт на натуральный мёд. Применяется по умолчанию.</li>
                      <li><strong>ГОСТ 31766-2012</strong> — стандарт на мёд монофлорный (одного ботанического происхождения). Содержит более строгие и дифференцированные нормы пролина.</li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card>
                <LegendBlock />
              </Card>
            </div>
          )}

          {/* ── TAB: Prompt ── */}
          {activeTab === "prompt" && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>📋</span> Готовый AI-промт
                </h2>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                    copied ? "bg-emerald-500 text-white" : "bg-amber-400 hover:bg-amber-500 text-white"
                  }`}
                >
                  {copied ? "✅ Скопировано!" : "📋 Копировать промт"}
                </button>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 overflow-auto max-h-[600px] text-xs font-mono text-slate-100 leading-relaxed whitespace-pre-wrap border border-slate-700 shadow-inner">
                {prompt}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold mb-2">💡 Как использовать этот промт:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs text-amber-700">
                  <li>Выберите вид мёда и нормативный документ (ГОСТ) в левой панели</li>
                  <li>Введите исходные показатели купажа</li>
                  <li>Нажмите «Копировать промт» выше</li>
                  <li>Вставьте в ChatGPT / Claude / Gemini / любой AI</li>
                  <li>AI ответит от лица 6 специалистов с детальной проработкой</li>
                  <li>Получите готовую НТД: рецептуру + регламент + план контроля</li>
                </ol>
              </div>
            </Card>
          )}

          {/* Roles card (always visible) */}
          <Card>
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <span>👥</span> Команда специалистов
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { icon: "🔬", role: "Технолог-рецептуролог", task: "Рецептура и валидация" },
                { icon: "📊", role: "Аналитический химик", task: "ВЭЖХ · Шаде · пролин" },
                { icon: "🏭", role: "Технолог производства", task: "Регламент купажирования" },
                { icon: "📋", role: "Нормировщик", task: "ГОСТ · ТР ТС · Codex" },
                { icon: "🧪", role: "QC-менеджер", task: "HACCP · hold-точки" },
                { icon: "📈", role: "Оптимизатор", task: "Экономика дозировок" },
              ].map((r) => (
                <div key={r.role} className="flex items-start gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="text-lg shrink-0">{r.icon}</span>
                  <div>
                    <p className="text-xs font-bold text-slate-700 leading-tight">{r.role}</p>
                    <p className="text-xs text-slate-400">{r.task}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-amber-700/60 space-y-1">
        <p>🍯 Honey Formula Lab · Ф/Г · Диастаза (Верон) · Пролин (Пролин L)</p>
        <p>Нормативы: ГОСТ 19792-2017 · ГОСТ 31766-2012 · ТР ТС 021/2011</p>
        <p className="text-amber-500/50">Все расчёты носят рекомендательный характер — финальные значения подтвердить инструментальным анализом</p>
      </footer>
    </div>
  );
}
