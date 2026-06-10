import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  Focus,
  ImagePlus,
  Link as LinkIcon,
  ListChecks,
  NotebookPen,
  Pause,
  Play,
  Plus,
  RotateCcw,
  TimerReset,
  Underline,
  X
} from 'lucide-react';
import './styles.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'tasks', label: 'Tarefas', icon: ClipboardList },
  { id: 'focus', label: 'Foco', icon: Focus },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'journal', label: 'Diario', icon: NotebookPen },
  { id: 'studies', label: 'Estudos', icon: BookOpen }
];

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

const initialTasks = [
  {
    id: 1,
    title: 'Treino pesado - membros inferiores',
    type: 'rotina',
    time: '06:00',
    duration: 60,
    completed: true,
    focusLabel: 'Forjar energia fisica para o dia'
  },
  {
    id: 2,
    title: 'Devocional e leitura de literatura classica russa',
    type: 'rotina',
    time: '07:20',
    duration: 35,
    completed: false,
    focusLabel: 'Leitura disciplinada'
  },
  {
    id: 3,
    title: 'Modelar elasticidade-preco com microdados PNAD',
    type: 'avulsa',
    time: '09:00',
    duration: 120,
    completed: false,
    focusLabel: 'Econometria aplicada'
  },
  {
    id: 4,
    title: 'Extrair dados com SQL no BigQuery',
    type: 'avulsa',
    time: '14:00',
    duration: 90,
    completed: false,
    focusLabel: 'Pipeline de dados'
  },
  {
    id: 5,
    title: 'Revisao ativa - inferencia causal',
    type: 'rotina',
    time: '20:30',
    duration: 50,
    completed: false,
    focusLabel: 'Base teorica'
  }
];

const initialHabits = [
  { id: 'h1', name: 'Treinar', days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], time: '06:00' },
  { id: 'h2', name: 'Devocional', days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'], time: '07:20' },
  { id: 'h3', name: 'Leitura tecnica em ingles', days: ['Ter', 'Qui', 'Sab'], time: '21:20' }
];

const initialStudies = [
  {
    id: 's1',
    subject: 'Econometria - Modelagem Staggered DiD',
    days: 'Seg, Qua, Sex',
    links: 'https://papers.ssrn.com, https://github.com/causalinference',
    methodology: 'Resolver uma prova curta, reimplementar estimadores em R e registrar premissas violadas no diario.'
  },
  {
    id: 's2',
    subject: 'Engenharia de Dados - BigQuery e dbt',
    days: 'Ter, Qui',
    links: 'https://cloud.google.com/bigquery/docs',
    methodology: 'Criar marts incrementais com testes de qualidade e comparar custo por consulta.'
  }
];

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('trail_tasks');
    return (saved ? JSON.parse(saved) : initialTasks).sort((a, b) => a.time.localeCompare(b.time));
  });
  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('trail_habits');
    return saved ? JSON.parse(saved) : initialHabits;
  });
  const [studies, setStudies] = useState(() => {
    const saved = localStorage.getItem('trail_studies');
    return saved ? JSON.parse(saved) : initialStudies;
  });
  const [frictionTask, setFrictionTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [focusSession, setFocusSession] = useState(null);

  useEffect(() => {
    localStorage.setItem('trail_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('trail_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('trail_studies', JSON.stringify(studies));
  }, [studies]);

  const metrics = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const routines = tasks.filter((task) => task.type === 'rotina').length;
    return {
      total: tasks.length,
      completed,
      pending: tasks.length - completed,
      routines,
      adHoc: tasks.length - routines,
      completionRate: Math.round((completed / tasks.length) * 100)
    };
  }, [tasks]);

  const toggleTask = (task) => {
    if (task.completed) {
      setFrictionTask(task);
      return;
    }
    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: true } : item)));
  };

  const updateTask = (updatedTask, applyToAll) => {
    if (applyToAll && updatedTask.type === 'rotina') {
      const oldTitle = editingTask.title;
      setTasks((current) =>
        current.map((task) =>
          task.title === oldTitle && task.type === 'rotina'
            ? { ...task, title: updatedTask.title, time: updatedTask.time, duration: updatedTask.duration }
            : task
        ).sort((a, b) => a.time.localeCompare(b.time))
      );
      setHabits((current) =>
        current.map((habit) =>
          (habit.name === oldTitle || habit.id === updatedTask.id)
            ? { ...habit, name: updatedTask.title, time: updatedTask.time }
            : habit
        )
      );
    } else {
      setTasks((current) => {
        const exists = current.some(t => t.id === updatedTask.id);
        if (exists) {
          return current.map((task) => (task.id === updatedTask.id ? updatedTask : task))
            .sort((a, b) => a.time.localeCompare(b.time));
        }
        return [...current, updatedTask].sort((a, b) => a.time.localeCompare(b.time));
      });
    }
    setEditingTask(null);
  };

  const deleteTask = (id, applyToAll) => {
    const taskToDelete = editingTask;
    if (applyToAll && taskToDelete && taskToDelete.type === 'rotina') {
      const titleToDelete = taskToDelete.title;
      setTasks((current) => current.filter((t) => !(t.title === titleToDelete && t.type === 'rotina')));
      setHabits((current) => current.filter((h) => h.name !== titleToDelete && h.id !== id));
    } else {
      setTasks((current) => current.filter((t) => t.id !== id));
    }
    setEditingTask(null);
  };

  const registerFriction = (reason) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === frictionTask.id ? { ...task, completed: false, friction: reason } : task
      )
    );
    setFrictionTask(null);
  };

  if (focusSession) {
    return <AbsoluteFocus session={focusSession} onExit={() => setFocusSession(null)} />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="workspace">
        <Header activeView={activeView} metrics={metrics} />
        {activeView === 'dashboard' && <Dashboard tasks={tasks} metrics={metrics} onToggleTask={toggleTask} />}
        {activeView === 'tasks' && (
          <TaskManager
            habits={habits}
            tasks={tasks}
            setHabits={setHabits}
            setTasks={setTasks}
            onForceFriction={(task) => setFrictionTask(task)}
            onEditTask={setEditingTask}
          />
        )}
        {activeView === 'focus' && <FocusModule tasks={tasks} onStart={setFocusSession} />}
        {activeView === 'calendar' && (
          <ExecutionCalendar tasks={tasks} setTasks={setTasks} habits={habits} onEditTask={setEditingTask} />
        )}
        {activeView === 'journal' && <Journal />}
        {activeView === 'studies' && <StudyBase studies={studies} setStudies={setStudies} setTasks={setTasks} />}
      </main>
      {frictionTask && <FrictionModal task={frictionTask} onClose={() => setFrictionTask(null)} onSubmit={registerFriction} />}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={updateTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}

function Sidebar({ activeView, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/imagens/logo_sem_fundo.png" alt="Trail" />
        <div>
          <span>Trail</span>
        </div>
      </div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={activeView === item.id ? 'nav-item active' : 'nav-item'} key={item.id} onClick={() => onNavigate(item.id)}>
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-status">
        <CircleDashed size={18} />
        <span>Disciplina em execucao</span>
      </div>
    </aside>
  );
}

function Header({ activeView, metrics }) {
  const title = navItems.find((item) => item.id === activeView)?.label ?? 'Dashboard';
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Sistema diario de execucao</p>
        <h1>{title}</h1>
      </div>
    </header>
  );
}

function MetricPill({ label, value, tone }) {
  return (
    <div className={`metric-pill ${tone ?? ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Dashboard({ tasks, metrics, onToggleTask }) {
  return (
    <section className="dashboard-grid">
      <div className="daily-panel">
        <SectionTitle icon={ListChecks} eyebrow="Hoje" title="Linha de execucao" />
        <div className="task-list">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task)} />
          ))}
        </div>
      </div>
      <div className="metrics-stack">
        <div className="pill-grid">
          <MetricPill label="Concluidas" value={metrics.completed} tone="success" />
          <MetricPill label="Pendentes" value={metrics.pending} tone="danger" />
          <MetricPill label="Aderencia" value={`${metrics.completionRate}%`} />
        </div>
        <ProgressRing value={metrics.completionRate} />
        <BarMetric title="Concluidas vs pendentes" leftLabel="Feito" left={metrics.completed} rightLabel="Aberto" right={metrics.pending} />
        <BarMetric title="Rotina vs avulsa" leftLabel="Rotina" left={metrics.routines} rightLabel="Avulsa" right={metrics.adHoc} />
      </div>
    </section>
  );
}

function TaskRow({ task, onToggle }) {
  return (
    <article className={`task-row ${task.completed ? 'done' : ''}`}>
      <div className="task-time-check">
        <button className="check-button" onClick={onToggle} aria-label={task.completed ? 'Marcar como nao concluida' : 'Concluir tarefa'}>
          {task.completed ? <Check size={18} /> : null}
        </button>
        <span className="large-time">{task.time}</span>
      </div>
      <div className="task-copy">
        <div>
          <h3>{task.title}</h3>
          <span className={`tag ${task.type}`}>{task.type}</span>
        </div>
        <p>{task.duration} min</p>
        {task.friction && <small>Friccao registrada: {task.friction}</small>}
      </div>
    </article>
  );
}

function SectionTitle({ icon: Icon, eyebrow, title }) {
  return (
    <div className="section-title">
      <Icon size={20} />
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function ProgressRing({ value }) {
  const angle = `${value * 3.6}deg`;
  return (
    <div className="ring-card">
      <div className="progress-ring" style={{ '--angle': angle }}>
        <div>
          <strong>{value}%</strong>
          <span>execucao</span>
        </div>
      </div>
      <p>Progresso</p>
    </div>
  );
}

function BarMetric({ title, leftLabel, left, rightLabel, right }) {
  const total = Math.max(left + right, 1);
  const leftPct = Math.round((left / total) * 100);
  const rightPct = Math.round((right / total) * 100);
  return (
    <div className="bar-card">
      <h3>{title}</h3>
      <div className="stacked-bar">
        <span className="bar-success" style={{ width: `${(left / total) * 100}%` }} />
        <span className="bar-danger" style={{ width: `${(right / total) * 100}%` }} />
      </div>
      <div className="bar-legend">
        <span>{leftLabel}: {left} ({leftPct}%)</span>
        <span>{rightLabel}: {right} ({rightPct}%)</span>
      </div>
    </div>
  );
}

function TaskManager({ habits, tasks, setHabits, setTasks, onForceFriction, onEditTask }) {
  const [habitName, setHabitName] = useState('');
  const [habitTime, setHabitTime] = useState('06:00');
  const [selectedDays, setSelectedDays] = useState(['Seg', 'Qua', 'Sex']);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('16:00');
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);

  const addHabit = (event) => {
    event.preventDefault();
    if (!habitName.trim()) return;
    setHabits((current) => [...current, { id: crypto.randomUUID(), name: habitName, days: selectedDays, time: habitTime }]);
    setHabitName('');
  };

  const addTask = (event) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    setTasks((current) => [
      ...current,
      { id: Date.now(), title: taskTitle, type: 'avulsa', time: taskTime, date: taskDate, duration: 45, completed: false, focusLabel: taskTitle }
    ].sort((a, b) => a.time.localeCompare(b.time)));
    setTaskTitle('');
  };

  const toggleDay = (day) => {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  return (
    <section className="manager-grid">
      <form className="tool-panel" onSubmit={addHabit}>
        <SectionTitle icon={RotateCcw} eyebrow="Rotinas" title="Habitos diarios" />
        <label>Atividade recorrente<input value={habitName} onChange={(event) => setHabitName(event.target.value)} /></label>
        <label>Horario<input type="time" value={habitTime} onChange={(event) => setHabitTime(event.target.value)} /></label>
        <div className="day-picker">
          {weekDays.map((day) => <button type="button" className={selectedDays.includes(day) ? 'selected' : ''} onClick={() => toggleDay(day)} key={day}>{day}</button>)}
        </div>
        <button className="primary-action" type="submit"><Plus size={18} /> Cadastrar rotina</button>
      </form>
      <form className="tool-panel" onSubmit={addTask}>
        <SectionTitle icon={Plus} eyebrow="Avulsas" title="Demandas unicas" />
        <label>Tarefa<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /></label>
        <div className="number-grid">
          <label>Horario<input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} /></label>
          <label>Data<input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /></label>
        </div>
        <button className="primary-action" type="submit"><Plus size={18} /> Forjar tarefa</button>
      </form>
      <div className="tool-panel wide">
        <ExecutionCalendar tasks={tasks} setTasks={setTasks} habits={habits} onEditTask={onEditTask} />
      </div>
    </section>
  );
}

function FrictionModal({ task, onClose, onSubmit }) {
  const reasons = ['Falta de tempo', 'Falta de energia', 'Faltou insumo', 'Procrastinacao'];
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="friction-modal">
        <button className="ghost-icon close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        <p className="eyebrow">Log de friccao obrigatorio</p>
        <h2>{task.title}</h2>
        <div className="reason-grid">
          {reasons.map((reason) => <button key={reason} onClick={() => onSubmit(reason)}>{reason}</button>)}
        </div>
      </div>
    </div>
  );
}

function EditTaskModal({ task, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(task.title);
  const [time, setTime] = useState(task.time);
  const [duration, setDuration] = useState(task.duration || 60);
  const [date, setDate] = useState(task.date || new Date().toISOString().split('T')[0]);
  const [applyToAll, setApplyToAll] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...task, title, time, duration: Number(duration), date }, applyToAll);
    onClose();
  };

  const handleDelete = () => {
    onDelete(task.id, applyToAll);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="friction-modal">
        <button className="ghost-icon close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        <p className="eyebrow">Editar Tarefa</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label>
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <div className="number-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <label>
              Horário
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </label>
            <label>
              Duração (min)
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required />
            </label>
            <label>
              Data
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          {task.type === 'rotina' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none' }}>
              <input 
                type="checkbox" 
                checked={applyToAll} 
                onChange={(e) => setApplyToAll(e.target.checked)}
              />
              Aplicar a todas as ocorrências (Rotina)
            </label>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="primary-action" type="submit" style={{ flex: 1 }}>
              <Check size={18} /> Salvar
            </button>
            <button className="primary-action danger-button" type="button" onClick={handleDelete} style={{ flex: 1 }}>
              <X size={18} /> Excluir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FocusModule({ tasks, onStart }) {
  const [study, setStudy] = useState(50);
  const [breakTime, setBreakTime] = useState(10);
  const [cycles, setCycles] = useState(3);
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? '');
  const task = tasks.find((item) => item.id === Number(taskId)) ?? tasks[0];

  const adjust = (setter, val, delta, min = 1) => setter(Math.max(val + delta, min));

  return (
    <section className="focus-layout">
      <div className="tool-panel focus-config">
        <SectionTitle icon={TimerReset} eyebrow="Pomodoro" title="Foco absoluto" />
        <label>Tarefa em foco<select value={taskId} onChange={(event) => setTaskId(event.target.value)}>{tasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <div className="number-grid">
          <div className="counter-field">
            <label>Foco</label>
            <div className="counter-controls">
              <button onClick={() => adjust(setStudy, study, -5, 5)}>-</button>
              <input type="number" value={study} onChange={(e) => setStudy(Number(e.target.value))} />
              <button onClick={() => adjust(setStudy, study, 5)}>+</button>
            </div>
          </div>
          <div className="counter-field">
            <label>Intervalo</label>
            <div className="counter-controls">
              <button onClick={() => adjust(setBreakTime, breakTime, -1, 1)}>-</button>
              <input type="number" value={breakTime} onChange={(e) => setBreakTime(Number(e.target.value))} />
              <button onClick={() => adjust(setBreakTime, breakTime, 1)}>+</button>
            </div>
          </div>
          <div className="counter-field">
            <label>Ciclos</label>
            <div className="counter-controls">
              <button onClick={() => adjust(setCycles, cycles, -1, 1)}>-</button>
              <input type="number" value={cycles} onChange={(e) => setCycles(Number(e.target.value))} />
              <button onClick={() => adjust(setCycles, cycles, 1)}>+</button>
            </div>
          </div>
        </div>
        <button className="primary-action xl" onClick={() => onStart({ task, study, breakTime, cycles })}><Play size={20} /> Iniciar</button>
      </div>
    </section>
  );
}

function AbsoluteFocus({ session, onExit }) {
  const [seconds, setSeconds] = useState(session.study * 60);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((current) => Math.max(current - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <main className="absolute-focus">
      <p className="eyebrow">Modo foco absoluto</p>
      <div className="focus-clock">{minutes}:{secs}</div>
      <h1>{session.task.focusLabel}</h1>
      <button onClick={onExit}><Pause size={16} /> Interromper</button>
    </main>
  );
}

function ExecutionCalendar({ tasks, setTasks, habits = [], onEditTask }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [mode, setMode] = useState('week');
  const hours = Array.from({ length: 17 }, (_, index) => index + 6);

  const startOfWeek = useMemo(() => {
    const d = new Date(viewDate);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1); // Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [viewDate]);

  const weekDaysDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [startOfWeek]);

  const handlePrev = () => {
    const newDate = new Date(viewDate);
    if (mode === 'week') newDate.setDate(viewDate.getDate() - 7);
    else newDate.setMonth(viewDate.getMonth() - 1);
    setViewDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(viewDate);
    if (mode === 'week') newDate.setDate(viewDate.getDate() + 7);
    else newDate.setMonth(viewDate.getMonth() + 1);
    setViewDate(newDate);
  };

  const toggleTaskStatus = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayName = weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1];

    const filteredTasks = tasks.filter(task => {
      if (task.type === 'rotina') {
        return !task.date || task.date === dateStr;
      }
      return task.date === dateStr;
    });

    const filteredHabits = habits.filter(h => h.days.includes(dayName)).map(h => ({
      id: h.id,
      title: h.name,
      type: 'rotina',
      time: h.time,
      duration: 60,
      completed: false,
      isHabit: true
    }));

    return [...filteredTasks, ...filteredHabits];
  };

  const monthName = viewDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
  const year = viewDate.getFullYear();

  return (
    <section className="calendar-panel">
      <div className="panel-head">
        <div className="calendar-nav">
          <SectionTitle icon={CalendarDays} eyebrow="Execucao" title="Calendario tatico" />
          <button className="ghost-icon" onClick={handlePrev}><ChevronLeft size={18} /></button>
          <span>{mode === 'week' ? `Semana de ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}` : `${monthName} ${year}`}</span>
          <button className="ghost-icon" onClick={handleNext}><ChevronRight size={18} /></button>
        </div>
        <div className="segmented">
          <button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Semanal</button>
          <button className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Mensal</button>
        </div>
      </div>

      {mode === 'week' ? (
        <div className="week-grid">
          <div className="time-col">
            <div className="day-header" style={{ height: 32 }} />
            {hours.map((hour) => <span key={hour}>{String(hour).padStart(2, '0')}:00</span>)}
          </div>
          {weekDaysDates.map((date, index) => {
            const dayTasks = getTasksForDate(date);
            return (
              <div className="day-col" key={index}>
                <div className="day-header">
                  <span>{date.getDate()}</span>
                  <strong>{weekDays[index]}</strong>
                </div>
                {hours.map((hour) => <span className="hour-slot" key={hour} />)}
                {dayTasks.map((task) => (
                  <CalendarBlock 
                    key={`${task.id}-${index}`} 
                    task={task} 
                    onToggle={() => toggleTaskStatus(task.id)}
                    onDelete={() => deleteTask(task.id)}
                    onEdit={() => onEditTask(task)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="month-grid">
          {(() => {
            const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
            const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
            const startDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
            
            const days = [];
            for (let i = 0; i < startDay; i++) days.push(null);
            for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
              days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
            }

            return days.map((date, index) => {
              if (!date) return <div className="month-day empty" key={`empty-${index}`} />;
              
              const dayTasks = getTasksForDate(date);
              const routineCount = dayTasks.filter(t => t.type === 'rotina').length;
              const avulsaCount = dayTasks.filter(t => t.type === 'avulsa').length;

              return (
                <div 
                  className="month-day" 
                  key={index} 
                  onClick={() => {
                    setViewDate(date);
                    setMode('week');
                  }}
                >
                  <span>{date.getDate()}</span>
                  <div className="day-counts">
                    {routineCount > 0 && <div className="count-pill routine">{routineCount} Rotinas</div>}
                    {avulsaCount > 0 && <div className="count-pill avulsa">{avulsaCount} Avulsas</div>}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </section>
  );
}

function CalendarBlock({ task, onToggle, onDelete, onEdit }) {
  const [hour, minute] = task.time.split(':').map(Number);
  const top = ((hour - 6) * 48) + (minute / 60) * 48 + 40; // Adjusted for day header
  const height = Math.max((task.duration / 60) * 48, 34);
  
  return (
    <div className={`calendar-block ${task.completed ? 'complete' : ''}`} style={{ top, height }} onClick={onEdit}>
      {task.title}
      <div className="block-actions">
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }}><Check size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}><X size={14} /></button>
      </div>
    </div>
  );
}

function Journal() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem('trail_journal');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const editorRef = useRef(null);
  const [image, setImage] = useState('');

  useEffect(() => {
    localStorage.setItem('trail_journal', JSON.stringify(entries));
  }, [entries]);

  const command = (name) => {
    document.execCommand(name, false, null);
    editorRef.current?.focus();
  };

  const addLink = () => {
    const url = window.prompt('URL externa');
    if (url) document.execCommand('createLink', false, url);
  };

  const addImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const saveEntry = () => {
    const content = editorRef.current.innerHTML;
    if (!title.trim() && !content.trim()) return;

    if (currentId) {
      setEntries(prev => prev.map(e => e.id === currentId ? { ...e, title, content, image } : e));
    } else {
      const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString('pt-BR'),
        title: title || 'Sem título',
        content,
        image
      };
      setEntries(prev => [newEntry, ...prev]);
      setCurrentId(newEntry.id);
    }
  };

  const loadEntry = (entry) => {
    setCurrentId(entry.id);
    setTitle(entry.title);
    setImage(entry.image || '');
    if (editorRef.current) {
      editorRef.current.innerHTML = entry.content;
    }
  };

  const startNewEntry = () => {
    setCurrentId(null);
    setTitle('');
    setImage('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '<h2>Registro de bordo</h2><p>Digite aqui...</p>';
    }
  };

  return (
    <section className="journal-panel">
      <div className="editor-header" style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' }}>
        <label style={{ flex: 1 }}>
          Título do Registro
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
          />
        </label>
        <button className="primary-action" onClick={saveEntry} style={{ minWidth: '120px' }}>
          <Check size={18} /> Salvar
        </button>
        <button className="ghost-icon" onClick={startNewEntry} title="Novo Registro">
          <Plus size={18} />
        </button>
      </div>

      <div className="editor-toolbar">
        <button onClick={() => command('bold')}>B</button>
        <button onClick={() => command('strikeThrough')}>S</button>
        <button onClick={() => command('underline')}><Underline size={16} /></button>
        <button onClick={() => command('insertUnorderedList')}>Lista</button>
        <button onClick={() => command('insertOrderedList')}>1.</button>
        <button onClick={addLink}><LinkIcon size={16} /></button>
        <label className="upload-button"><ImagePlus size={16} /><input type="file" accept="image/*" onChange={addImage} /></label>
      </div>

      <div className="rich-editor" ref={editorRef} contentEditable suppressContentEditableWarning>
        <h2>Registro de bordo</h2>
        <p>Hipotese do dia: remover atrito operacional antes do bloco de econometria.</p>
        <ul><li>Checar datasets limpos</li><li>Registrar falhas de energia sem negociar com a meta</li></ul>
      </div>

      {image && <img className="journal-image" src={image} alt="Upload do diario" />}

      <div className="journal-history">
        <SectionTitle icon={NotebookPen} eyebrow="Histórico" title="Registros Passados" />
        {entries.map((entry) => (
          <div className="history-card" key={entry.id} onClick={() => loadEntry(entry)}>
            <div>
              <h4>{entry.title}</h4>
              <span>{entry.date}</span>
            </div>
            <ChevronRight size={18} />
          </div>
        ))}
      </div>
    </section>
  );
}

function StudyBase({ studies, setStudies, setTasks }) {
  const [draft, setDraft] = useState({ subject: '', days: '', links: '', methodology: '', time: '18:00' });

  const submit = (event) => {
    event.preventDefault();
    if (!draft.subject.trim()) return;
    const id = crypto.randomUUID();
    setStudies((current) => [...current, { ...draft, id }]);
    
    // Add as a routine task as well
    setTasks((current) => [
      ...current,
      { 
        id: Date.now(), 
        title: draft.subject, 
        type: 'rotina', 
        time: draft.time, 
        duration: 60, 
        completed: false, 
        focusLabel: draft.subject 
      }
    ].sort((a, b) => a.time.localeCompare(b.time)));

    setDraft({ subject: '', days: '', links: '', methodology: '', time: '18:00' });
  };

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="study-grid">
      <form className="tool-panel" onSubmit={submit}>
        <SectionTitle icon={BookOpen} eyebrow="Base" title="Conhecimento" />
        <label>Nome da materia<input value={draft.subject} onChange={(event) => updateDraft('subject', event.target.value)} /></label>
        <div className="number-grid">
          <label>Dias programados<input value={draft.days} onChange={(event) => updateDraft('days', event.target.value)} /></label>
          <label>Horario<input type="time" value={draft.time} onChange={(event) => updateDraft('time', event.target.value)} /></label>
        </div>
        <label>Links em nuvem<input value={draft.links} onChange={(event) => updateDraft('links', event.target.value)} /></label>
        <label>Descricao da metodologia<textarea value={draft.methodology} onChange={(event) => updateDraft('methodology', event.target.value)} /></label>
        <button className="primary-action" type="submit"><Plus size={18} /> Adicionar materia</button>
      </form>
      <div className="study-list">
        {studies.map((study) => (
          <article className="study-card" key={study.id}>
            <div className="study-header">
              <h3>{study.subject}</h3>
              <strong>{study.time}</strong>
            </div>
            <p>{study.methodology}</p>
            <span>{study.days}</span>
            <small>{study.links}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
