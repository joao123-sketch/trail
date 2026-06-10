import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Dumbbell,
  Focus,
  ImagePlus,
  Link as LinkIcon,
  ListChecks,
  LogOut,
  NotebookPen,
  Pause,
  Play,
  Plus,
  RotateCcw,
  TimerReset,
  Underline,
  Users,
  Utensils,
  X
} from 'lucide-react';
import './styles.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'tasks', label: 'Tarefas', icon: ClipboardList },
  { id: 'focus', label: 'Foco', icon: Focus },
  { id: 'journal', label: 'Diário', icon: NotebookPen },
  { id: 'studies', label: 'Estudos', icon: BookOpen },
  { id: 'menu', label: 'Cardápio', icon: Utensils },
  { id: 'workout', label: 'Treino', icon: Dumbbell }
];

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayName = (date = new Date()) => {
  const jsDayIndex = date.getDay();
  return weekDays[jsDayIndex === 0 ? 6 : jsDayIndex - 1];
};

const getOccurrenceKey = (sourceType, sourceId, dateKey) => `${sourceType}:${sourceId}:${dateKey}`;

const getStoredOccurrenceKey = (task) => {
  if (task.occurrenceKey) return task.occurrenceKey;
  if (!task.originalId) return null;
  const sourceType = task.sourceType || (task.isMeal ? 'meal' : task.isWorkout ? 'workout' : 'habit');
  return getOccurrenceKey(sourceType, task.originalId, task.date || getDateKey());
};

const getGeneratedTasksForDate = ({ date = new Date(), tasks, habits = [], meals = [], workouts = [] }) => {
  const dateKey = getDateKey(date);
  const dayName = getDayName(date);

  const storedTasksForDate = tasks.filter(task => {
    if (task.type === 'rotina') return !task.date || task.date === dateKey;
    return task.date === dateKey;
  });

  const storedOccurrenceKeys = new Set(storedTasksForDate.map(getStoredOccurrenceKey).filter(Boolean));

  const filteredHabits = habits
    .filter(h => h.days.includes(dayName) && !storedOccurrenceKeys.has(getOccurrenceKey('habit', h.id, dateKey)))
    .map(h => ({
      id: getOccurrenceKey('habit', h.id, dateKey),
      originalId: h.id,
      sourceType: 'habit',
      sourceId: h.id,
      occurrenceKey: getOccurrenceKey('habit', h.id, dateKey),
      date: dateKey,
      title: h.name,
      type: 'rotina',
      time: h.time,
      duration: h.duration || 60,
      completed: false,
      isHabit: true
    }));

  const filteredMeals = meals
    .filter(m => m.day === dayName && !storedOccurrenceKeys.has(getOccurrenceKey('meal', m.id, dateKey)))
    .map(m => ({
      id: getOccurrenceKey('meal', m.id, dateKey),
      originalId: m.id,
      sourceType: 'meal',
      sourceId: m.id,
      occurrenceKey: getOccurrenceKey('meal', m.id, dateKey),
      date: dateKey,
      title: `Nutrição: ${m.type} - ${m.description}`,
      type: 'rotina',
      time: m.time,
      duration: 30,
      completed: false,
      isMeal: true
    }));

  const filteredWorkouts = workouts
    .filter(w => w.days.includes(dayName) && !storedOccurrenceKeys.has(getOccurrenceKey('workout', w.id, dateKey)))
    .map(w => ({
      id: getOccurrenceKey('workout', w.id, dateKey),
      originalId: w.id,
      sourceType: 'workout',
      sourceId: w.id,
      occurrenceKey: getOccurrenceKey('workout', w.id, dateKey),
      date: dateKey,
      title: `Treino: ${w.title}`,
      type: 'rotina',
      time: w.time,
      duration: 60,
      completed: false,
      isWorkout: true
    }));

  return [...storedTasksForDate, ...filteredHabits, ...filteredMeals, ...filteredWorkouts].sort((a, b) => a.time.localeCompare(b.time));
};

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
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('trail_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('trail_users');
    return saved ? JSON.parse(saved) : [{ id: 'admin', username: 'admin', password: '123', role: 'admin' }];
  });

  const [activeView, setActiveView] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [studies, setStudies] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);

  useEffect(() => {
    localStorage.setItem('trail_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('trail_current_user', JSON.stringify(currentUser));
      const uId = currentUser.id;
      
      const savedTasks = localStorage.getItem(`trail_${uId}_tasks`);
      setTasks((savedTasks ? JSON.parse(savedTasks) : initialTasks).sort((a, b) => a.time.localeCompare(b.time)));
      
      const savedHabits = localStorage.getItem(`trail_${uId}_habits`);
      setHabits(savedHabits ? JSON.parse(savedHabits) : initialHabits);
      
      const savedStudies = localStorage.getItem(`trail_${uId}_studies`);
      setStudies(savedStudies ? JSON.parse(savedStudies) : initialStudies);

      const savedJournal = localStorage.getItem(`trail_${uId}_journal`);
      setJournalEntries(savedJournal ? JSON.parse(savedJournal) : []);

      const savedMeals = localStorage.getItem(`trail_${uId}_meals`);
      setMeals(savedMeals ? JSON.parse(savedMeals) : []);

      const savedWorkouts = localStorage.getItem(`trail_${uId}_workouts`);
      setWorkouts(savedWorkouts ? JSON.parse(savedWorkouts) : []);
    } else {
      localStorage.removeItem('trail_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`trail_${currentUser.id}_tasks`, JSON.stringify(tasks));
  }, [tasks, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`trail_${currentUser.id}_habits`, JSON.stringify(habits));
  }, [habits, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`trail_${currentUser.id}_studies`, JSON.stringify(studies));
  }, [studies, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`trail_${currentUser.id}_journal`, JSON.stringify(journalEntries));
  }, [journalEntries, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`trail_${currentUser.id}_meals`, JSON.stringify(meals));
  }, [meals, currentUser]);

  useEffect(() => {
    if (currentUser) localStorage.setItem(`trail_${currentUser.id}_workouts`, JSON.stringify(workouts));
  }, [workouts, currentUser]);

  const [frictionTask, setFrictionTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [focusSession, setFocusSession] = useState(null);

  const todaysTasks = useMemo(() => {
    return getGeneratedTasksForDate({ tasks, habits, meals, workouts });

    const todayStr = new Date().toISOString().split('T')[0];
    const jsDayIndex = new Date().getDay();
    const dayName = weekDays[jsDayIndex === 0 ? 6 : jsDayIndex - 1];

    const storedTasksForToday = tasks.filter(task => {
      if (task.type === 'rotina') return !task.date || task.date === todayStr;
      return task.date === todayStr;
    });

    // Use a Set to track IDs of generated items that have already been converted to real tasks for today
    const storedIds = new Set(storedTasksForToday.map(t => t.originalId || t.id));

    const filteredHabits = habits.filter(h => h.days.includes(dayName) && !storedIds.has(h.id)).map(h => ({
      id: h.id,
      title: h.name,
      type: 'rotina',
      time: h.time,
      duration: h.duration || 60,
      completed: false,
      isHabit: true
    }));

    const filteredMeals = meals.filter(m => m.day === dayName && !storedIds.has(m.id)).map(m => ({
      id: m.id,
      title: `Nutrição: ${m.type} - ${m.description}`,
      type: 'rotina',
      time: m.time,
      duration: 30,
      completed: false,
      isMeal: true
    }));

    const filteredWorkouts = workouts.filter(w => w.days.includes(dayName) && !storedIds.has(w.id)).map(w => ({
      id: w.id,
      title: `Treino: ${w.title}`,
      type: 'rotina',
      time: w.time,
      duration: 60,
      completed: false,
      isWorkout: true
    }));

    return [...storedTasksForToday, ...filteredHabits, ...filteredMeals, ...filteredWorkouts].sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks, habits, meals, workouts]);

  const metrics = useMemo(() => {
    if (todaysTasks.length === 0) return { total: 0, completed: 0, pending: 0, routines: 0, adHoc: 0, completionRate: 0 };
    const completed = todaysTasks.filter((task) => task.completed).length;
    const routines = todaysTasks.filter((task) => task.type === 'rotina').length;
    return {
      total: todaysTasks.length,
      completed,
      pending: todaysTasks.length - completed,
      routines,
      adHoc: todaysTasks.length - routines,
      completionRate: Math.round((completed / todaysTasks.length) * 100)
    };
  }, [todaysTasks]);

  const toggleTask = (task) => {
    if (task.completed) {
      setFrictionTask(task);
      return;
    }
    
    if (task.isHabit || task.isMeal || task.isWorkout) {
        const date = task.date || getDateKey();
        const sourceType = task.sourceType || (task.isMeal ? 'meal' : task.isWorkout ? 'workout' : 'habit');
        const sourceId = task.sourceId || task.originalId || task.id;
        const occurrenceKey = task.occurrenceKey || getOccurrenceKey(sourceType, sourceId, date);
        const completedTask = {
          ...task,
          id: crypto.randomUUID(),
          originalId: sourceId,
          sourceId,
          sourceType,
          occurrenceKey,
          date,
          completed: true,
          type: 'rotina'
        };

        setTasks(current => {
          const existingIndex = current.findIndex(item => getStoredOccurrenceKey(item) === occurrenceKey);
          if (existingIndex >= 0) {
            return current.map((item, index) => (index === existingIndex ? { ...item, completed: true } : item));
          }
          return [...current, completedTask].sort((a, b) => a.time.localeCompare(b.time));
        });
        return;

        // Create a unique ID for the completed instance but keep reference to original
        setTasks(current => [...current, { 
          ...task, 
          id: crypto.randomUUID(), 
          originalId: task.id, 
          date: new Date().toISOString().split('T')[0], 
          completed: true, 
          type: 'avulsa', 
          originalType: 'rotina' 
        }]);
    } else {
        setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, completed: true } : item)));
    }
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

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveView('dashboard');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} users={users} />;
  }

  if (focusSession) {
    return <AbsoluteFocus session={focusSession} onExit={() => setFocusSession(null)} />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} user={currentUser} onLogout={handleLogout} />
      <main className="workspace">
        <Header activeView={activeView} metrics={metrics} />
        {activeView === 'dashboard' && <Dashboard tasks={todaysTasks} metrics={metrics} onToggleTask={toggleTask} />}
        {activeView === 'tasks' && (
          <TaskManager
            habits={habits}
            tasks={tasks}
            setHabits={setHabits}
            setTasks={setTasks}
            meals={meals}
            workouts={workouts}
            onForceFriction={(task) => setFrictionTask(task)}
            onEditTask={setEditingTask}
          />
        )}
        {activeView === 'focus' && <FocusModule tasks={tasks} onStart={setFocusSession} />}
        {activeView === 'calendar' && (
          <ExecutionCalendar tasks={tasks} setTasks={setTasks} habits={habits} meals={meals} workouts={workouts} onEditTask={setEditingTask} />
        )}
        {activeView === 'journal' && <Journal entries={journalEntries} setEntries={setJournalEntries} />}
        {activeView === 'studies' && <StudyBase studies={studies} setStudies={setStudies} setTasks={setTasks} />}
        {activeView === 'menu' && <MealPlanner meals={meals} setMeals={setMeals} />}
        {activeView === 'workout' && <WorkoutTracker workouts={workouts} setWorkouts={setWorkouts} />}
        {activeView === 'admin' && currentUser.role === 'admin' && <UserManagement users={users} setUsers={setUsers} />}
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

function MealPlanner({ meals, setMeals }) {
  const [selectedDays, setSelectedDays] = useState(['Seg']);
  const [mealType, setMealType] = useState('Café da Manhã');
  const [time, setTime] = useState('08:00');
  const [description, setDescription] = useState('');

  const toggleDay = (day) => {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const addMeal = (e) => {
    e.preventDefault();
    if (!description.trim() || selectedDays.length === 0) return;
    
    const newMeals = selectedDays.map(day => ({
      id: crypto.randomUUID(),
      day,
      type: mealType,
      time,
      description
    }));
    
    setMeals([...meals, ...newMeals]);
    setDescription('');
  };

  const deleteMeal = (id) => {
    setMeals(meals.filter(m => m.id !== id));
  };

  return (
    <section className="manager-grid">
      <form className="tool-panel" onSubmit={addMeal}>
        <SectionTitle icon={Utensils} eyebrow="Nutrição" title="Planejar Refeição" />
        <div className="number-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <label>Refeição
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              <option>Café da Manhã</option>
              <option>Lanche da Manhã</option>
              <option>Almoço</option>
              <option>Lanche da Tarde</option>
              <option>Jantar</option>
              <option>Ceia</option>
            </select>
          </label>
          <label>Horário<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        </div>
        
        <label>Dias da Semana</label>
        <div className="day-picker" style={{ marginBottom: '12px' }}>
          {weekDays.map((day) => (
            <button 
              type="button" 
              className={selectedDays.includes(day) ? 'selected' : ''} 
              onClick={() => toggleDay(day)} 
              key={day}
            >
              {day}
            </button>
          ))}
        </div>

        <label>O que vou comer?<textarea value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <button className="primary-action" type="submit"><Plus size={18} /> Adicionar ao Cardápio</button>
      </form>

      <div className="tool-panel wide">
        <div className="meal-grid-display">
          {weekDays.map(d => (
            <div key={d} className="meal-day-column">
              <h3>{d}</h3>
              <div className="meal-list">
                {meals.filter(m => m.day === d)
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(m => (
                    <div key={m.id} className="meal-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong>{m.type}</strong>
                          <span style={{ fontSize: '0.65rem', color: 'var(--crimson)', fontWeight: 700 }}>{m.time}</span>
                        </div>
                        <button className="ghost-icon" onClick={() => deleteMeal(m.id)} style={{ width: '24px', height: '24px' }}><X size={12} /></button>
                      </div>
                      <p style={{ marginTop: '6px' }}>{m.description}</p>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkoutTracker({ workouts, setWorkouts }) {
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('07:00');
  const [selectedDays, setSelectedDays] = useState(['Seg']);
  const [exerciseList, setExerciseList] = useState([{ id: crypto.randomUUID(), name: '', sets: '', reps: '' }]);

  const toggleDay = (day) => {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const addExerciseRow = () => {
    setExerciseList([...exerciseList, { id: crypto.randomUUID(), name: '', sets: '', reps: '' }]);
  };

  const removeExerciseRow = (id) => {
    if (exerciseList.length > 1) {
      setExerciseList(exerciseList.filter(ex => ex.id !== id));
    }
  };

  const updateExerciseRow = (id, field, value) => {
    setExerciseList(exerciseList.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const addWorkout = (e) => {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0) return;

    const validExercises = exerciseList.filter(ex => ex.name.trim());

    const newWorkout = { 
      id: crypto.randomUUID(), 
      title, 
      time, 
      days: selectedDays.join(', '), 
      exercises: validExercises 
    };
    setWorkouts([...workouts, newWorkout]);
    setTitle('');
    setExerciseList([{ id: crypto.randomUUID(), name: '', sets: '', reps: '' }]);
  };

  const deleteWorkout = (id) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  return (
    <section className="manager-grid">
      <form className="tool-panel" onSubmit={addWorkout}>
        <SectionTitle icon={Dumbbell} eyebrow="Performance" title="Definir Treino" />
        <label>Título do Treino
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <div className="number-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label>Horário<input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <div />
        </div>

        <label>Dias da Semana</label>
        <div className="day-picker" style={{ marginBottom: '12px' }}>
          {weekDays.map((day) => (
            <button 
              type="button" 
              className={selectedDays.includes(day) ? 'selected' : ''} 
              onClick={() => toggleDay(day)} 
              key={day}
            >
              {day}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <label>Exercícios, Séries e Repetições</label>
          {exerciseList.map((ex, index) => (
            <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
              <input 
                placeholder="Exercício" 
                value={ex.name} 
                onChange={(e) => updateExerciseRow(ex.id, 'name', e.target.value)} 
              />
              <input 
                placeholder="Séries" 
                value={ex.sets} 
                onChange={(e) => updateExerciseRow(ex.id, 'sets', e.target.value)} 
              />
              <input 
                placeholder="Reps" 
                value={ex.reps} 
                onChange={(e) => updateExerciseRow(ex.id, 'reps', e.target.value)} 
              />
              {exerciseList.length > 1 && (
                <button 
                  type="button" 
                  className="ghost-icon" 
                  onClick={() => removeExerciseRow(ex.id)}
                  style={{ color: 'var(--crimson)', height: '44px', width: '44px' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
          <button 
            type="button" 
            className="nav-item" 
            onClick={addExerciseRow}
            style={{ justifyContent: 'center', borderStyle: 'dashed', borderColor: 'var(--line)' }}
          >
            <Plus size={18} /> Adicionar Exercício
          </button>
        </div>

        <button className="primary-action" type="submit" style={{ marginTop: '12px' }}>
          <Plus size={18} /> Cadastrar Treino
        </button>
      </form>

      <div className="tool-panel wide">
        <div className="meal-grid-display">
          {weekDays.map(d => (
            <div key={d} className="meal-day-column">
              <h3>{d}</h3>
              <div className="meal-list">
                {workouts.filter(w => w.days.includes(d)).map(w => (
                  <div key={w.id} className="meal-card workout-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ textTransform: 'none', fontSize: '0.9rem' }}>{w.title}</strong>
                        <span style={{ fontSize: '0.65rem', color: 'var(--apex)', fontWeight: 700 }}>{w.time}</span>
                      </div>
                      <button className="ghost-icon" onClick={() => deleteWorkout(w.id)} style={{ width: '24px', height: '24px' }}><X size={12} /></button>
                    </div>
                    <div style={{ marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                      {Array.isArray(w.exercises) ? w.exercises.map(ex => (
                        <div key={ex.id} style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>{ex.name}</span>
                          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{ex.sets}x{ex.reps}</span>
                        </div>
                      )) : <p style={{ fontSize: '0.8rem', whiteSpace: 'pre-line' }}>{w.exercises}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Sidebar({ activeView, onNavigate, user, onLogout }) {
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
        {user.role === 'admin' && (
          <button className={activeView === 'admin' ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate('admin')}>
            <Users size={18} />
            <span>Usuários</span>
          </button>
        )}
      </nav>
      <div className="sidebar-footer" style={{ marginTop: 'auto', display: 'grid', gap: '8px' }}>
        <div className="sidebar-status">
          <CircleDashed size={18} />
          <span>{user.username}</span>
        </div>
        <button className="nav-item" onClick={onLogout} style={{ color: 'var(--crimson)' }}>
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}

function Header({ activeView, metrics }) {
  const title = navItems.find((item) => item.id === activeView)?.label ?? 'Dashboard';
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Sistema diário de execução</p>
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
        <SectionTitle icon={ListChecks} eyebrow="Hoje" title="Linha de execução" />
        <div className="task-list">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task)} />
          ))}
        </div>
      </div>
      <div className="metrics-stack">
        <div className="pill-grid">
          <MetricPill label="Concluídas" value={metrics.completed} tone="success" />
          <MetricPill label="Pendentes" value={metrics.pending} tone="danger" />
          <MetricPill label="Aderência" value={`${metrics.completionRate}%`} />
        </div>
        <ProgressRing value={metrics.completionRate} />
        <BarMetric title="Concluídas vs pendentes" leftLabel="Feito" left={metrics.completed} rightLabel="Aberto" right={metrics.pending} />
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

function TaskManager({ habits, tasks, setHabits, setTasks, meals = [], workouts = [], onForceFriction, onEditTask }) {
  const [habitName, setHabitName] = useState('');
  const [habitTime, setHabitTime] = useState('06:00');
  const [habitDuration, setHabitDuration] = useState(30);
  const [selectedDays, setSelectedDays] = useState(['Seg', 'Qua', 'Sex']);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('16:00');
  const [taskDuration, setTaskDuration] = useState(30);
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);

  const addHabit = (event) => {
    event.preventDefault();
    if (!habitName.trim()) return;
    setHabits((current) => [...current, { id: crypto.randomUUID(), name: habitName, days: selectedDays, time: habitTime, duration: Number(habitDuration) }]);
    setHabitName('');
  };

  const addTask = (event) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    setTasks((current) => [
      ...current,
      { id: Date.now(), title: taskTitle, type: 'avulsa', time: taskTime, date: taskDate, duration: Number(taskDuration), completed: false, focusLabel: taskTitle }
    ].sort((a, b) => a.time.localeCompare(b.time)));
    setTaskTitle('');
  };

  const toggleDay = (day) => {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const durationOptions = [15, 30, 45, 60];

  return (
    <section className="manager-grid">
      <form className="tool-panel" onSubmit={addHabit}>
        <SectionTitle icon={RotateCcw} eyebrow="Rotinas" title="Habitos diários" />
        <label>Atividade recorrente<input value={habitName} onChange={(event) => setHabitName(event.target.value)} /></label>
        <div className="number-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label>Horário<input type="time" value={habitTime} onChange={(event) => setHabitTime(event.target.value)} /></label>
          <label>Duração
            <select value={habitDuration} onChange={(e) => setHabitDuration(e.target.value)}>
              {durationOptions.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
        </div>
        <div className="day-picker">
          {weekDays.map((day) => <button type="button" className={selectedDays.includes(day) ? 'selected' : ''} onClick={() => toggleDay(day)} key={day}>{day}</button>)}
        </div>
        <button className="primary-action" type="submit"><Plus size={18} /> Cadastrar rotina</button>
      </form>
      <form className="tool-panel" onSubmit={addTask}>
        <SectionTitle icon={Plus} eyebrow="Avulsas" title="Demandas únicas" />
        <label>Tarefa<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /></label>
        <div className="number-grid">
          <label>Horário<input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} /></label>
          <label>Duração
            <select value={taskDuration} onChange={(e) => setTaskDuration(e.target.value)}>
              {durationOptions.map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
          <label>Data<input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} /></label>
        </div>
        <button className="primary-action" type="submit"><Plus size={18} /> Forjar tarefa</button>
      </form>
      <div className="tool-panel wide">
        <ExecutionCalendar tasks={tasks} setTasks={setTasks} habits={habits} meals={meals} workouts={workouts} onEditTask={onEditTask} />
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

  const adjust = (setter, val, delta, min = 1) => setter(Math.max(val + delta, min));

  return (
    <section className="focus-layout">
      <div className="tool-panel focus-config">
        <SectionTitle icon={TimerReset} eyebrow="Pomodoro" title="Foco absoluto" />
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
        <button className="primary-action xl" onClick={() => onStart({ study, breakTime, cycles })}><Play size={20} /> Iniciar Sessão</button>
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
      <h1>EXECUÇÃO EM ANDAMENTO</h1>
      <button onClick={onExit}><Pause size={16} /> Interromper</button>
    </main>
  );
}

function ExecutionCalendar({ tasks, setTasks, habits = [], meals = [], workouts = [], onEditTask }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [mode, setMode] = useState('week');
  const hours = Array.from({ length: 19 }, (_, index) => (index + 6) % 24);

  const startOfWeek = useMemo(() => {
    const d = new Date(viewDate);
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
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

  const getAllTasksForDate = useCallback((date) => {
    return getGeneratedTasksForDate({ date, tasks, habits, meals, workouts });

    const dateStr = date.toISOString().split('T')[0];
    const dayName = weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1];

    const storedTasksForDate = tasks.filter(task => {
      if (task.type === 'rotina') return !task.date || task.date === dateStr;
      return task.date === dateStr;
    });

    const storedIds = new Set(storedTasksForDate.map(t => t.originalId || t.id));

    const filteredHabits = habits.filter(h => h.days.includes(dayName) && !storedIds.has(h.id)).map(h => ({
      id: h.id,
      title: h.name,
      type: 'rotina',
      time: h.time,
      duration: h.duration || 60,
      completed: false,
      isHabit: true
    }));

    const filteredMeals = meals.filter(m => m.day === dayName && !storedIds.has(m.id)).map(m => ({
      id: m.id,
      title: `Nutrição: ${m.type} - ${m.description}`,
      type: 'rotina',
      time: m.time,
      duration: 30,
      completed: false,
      isMeal: true
    }));

    const filteredWorkouts = workouts.filter(w => w.days.includes(dayName) && !storedIds.has(w.id)).map(w => ({
      id: w.id,
      title: `Treino: ${w.title}`,
      type: 'rotina',
      time: w.time,
      duration: 60,
      completed: false,
      isWorkout: true
    }));

    return [...storedTasksForDate, ...filteredHabits, ...filteredMeals, ...filteredWorkouts].sort((a, b) => a.time.localeCompare(b.time));
  }, [tasks, habits, meals, workouts]);

  const getTasksByHourForDate = (date) => {
    const allDayTasks = getAllTasksForDate(date);
    
    // Group by hour
    const hourMap = {};
    hours.forEach(h => hourMap[h] = []);
    
    allDayTasks.forEach(task => {
      const h = parseInt(task.time.split(':')[0]);
      if (hourMap[h]) hourMap[h].push(task);
    });

    return hourMap;
  };

  const monthName = viewDate.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();
  const year = viewDate.getFullYear();

  // Calculate row heights based on maximum tasks across all days in that hour
  const rowHeights = useMemo(() => {
    const heights = {};
    hours.forEach(hour => {
      let maxTasks = 1;
      weekDaysDates.forEach(date => {
        const dayTasks = getAllTasksForDate(date);
        const count = dayTasks.filter(t => parseInt(t.time.split(':')[0]) === hour).length;
        if (count > maxTasks) maxTasks = count;
      });
      heights[hour] = maxTasks;
    });
    return heights;
  }, [hours, weekDaysDates, getAllTasksForDate]);

  return (
    <section className="calendar-panel">
      <div className="panel-head">
        <div className="calendar-nav">
          <SectionTitle icon={CalendarDays} eyebrow="Execução" title="Calendário táctico" />
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
        <div className="week-grid-container" style={{ overflowX: 'auto' }}>
          <div className="week-grid-new">
            {/* Header */}
            <div className="grid-header-row">
              <div className="time-label-cell" />
              {weekDaysDates.map((date, i) => (
                <div className="day-header-cell" key={i}>
                  <span>{date.getDate()}</span>
                  <strong>{weekDays[i]}</strong>
                </div>
              ))}
            </div>

            {/* Hours */}
            {hours.map(hour => (
              <div className="grid-hour-row" key={hour} style={{ minHeight: `${rowHeights[hour] * 60}px` }}>
                <div className="time-label-cell">
                  <span>{String(hour).padStart(2, '0')}:00</span>
                </div>
                {weekDaysDates.map((date, i) => {
                  const dayTasks = getTasksByHourForDate(date)[hour] || [];
                  return (
                    <div className="day-task-cell" key={i}>
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          className={`calendar-item ${task.completed ? 'complete' : ''}`}
                          style={{ minHeight: `${(task.duration / 60) * 56}px` }}
                          onClick={() => onEditTask(task)}
                        >
                          <div className="item-content">
                            <strong>{task.title}</strong>
                            <span>{task.time} ({task.duration}m)</span>
                          </div>
                          <div className="item-actions">
                            <button onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task.id); }}><Check size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}><X size={14} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="month-grid">
          {/* Keep existing month grid logic */}
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
              
              const dayTasks = getAllTasksForDate(date);
              const routineCount = dayTasks.filter(t => t.type === 'rotina').length;
              const avulsaCount = dayTasks.filter(t => t.type === 'avulsa').length;

              return (
                <div className="month-day" key={index} onClick={() => { setViewDate(date); setMode('week'); }}>
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

function CalendarBlock() { return null; } // Deprecated

function Journal({ entries, setEntries }) {
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState('');
  const editorRef = useRef(null);
  const [image, setImage] = useState('');

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

      {image && <img className="journal-image" src={image} alt="Upload do diário" />}

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
  const [draft, setDraft] = useState({ subject: '', links: '', methodology: '', time: '18:00', duration: 45 });
  const [selectedDays, setSelectedDays] = useState(['Seg', 'Qua', 'Sex']);
  const [weeks, setWeeks] = useState(4);
  const [editingId, setEditingId] = useState(null);

  const toggleDay = (day) => {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const submit = (event) => {
    event.preventDefault();
    if (!draft.subject.trim() || selectedDays.length === 0) return;
    
    if (editingId) {
      setStudies(current => current.map(s => s.id === editingId ? { ...draft, id: editingId, days: selectedDays.join(', '), weeks } : s));
      setEditingId(null);
    } else {
      const studyId = crypto.randomUUID();
      const newStudy = { ...draft, id: studyId, days: selectedDays.join(', '), weeks };
      setStudies((current) => [...current, newStudy]);
      
      // Generate Avulsa Tasks (only for new studies to avoid duplicates on simple edits)
      const newTasks = [];
      const today = new Date();
      
      selectedDays.forEach(dayName => {
        const dayIndex = weekDays.indexOf(dayName);
        const targetJsDay = (dayIndex + 1) % 7;
        
        for (let w = 0; w < weeks; w++) {
          const date = new Date(today);
          let diff = targetJsDay - date.getDay();
          if (diff < 0) diff += 7;
          
          date.setDate(date.getDate() + diff + (w * 7));
          const dateStr = date.toISOString().split('T')[0];
          
          newTasks.push({
            id: Date.now() + Math.random(),
            title: `Estudo: ${draft.subject}`,
            type: 'avulsa',
            time: draft.time,
            duration: Number(draft.duration),
            date: dateStr,
            completed: false,
            focusLabel: draft.subject
          });
        }
      });
      setTasks((current) => [...current, ...newTasks].sort((a, b) => a.time.localeCompare(b.time)));
    }

    setDraft({ subject: '', links: '', methodology: '', time: '18:00', duration: 45 });
    setSelectedDays(['Seg', 'Qua', 'Sex']);
    setWeeks(4);
  };

  const startEdit = (study) => {
    setEditingId(study.id);
    setDraft({ subject: study.subject, links: study.links, methodology: study.methodology, time: study.time, duration: study.duration });
    setSelectedDays(study.days.split(', '));
    setWeeks(study.weeks);
  };

  const deleteStudy = (id) => {
    if (confirm('Deseja excluir este planejamento? As tarefas já geradas no calendário permanecerão.')) {
      setStudies(current => current.filter(s => s.id !== id));
    }
  };

  const updateDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <section className="study-grid">
      <form className="tool-panel" onSubmit={submit}>
        <SectionTitle icon={BookOpen} eyebrow="Base" title={editingId ? "Editar Planejamento" : "Planejamento de Estudos"} />
        <label>Nome da matéria<input value={draft.subject} onChange={(e) => updateDraft('subject', e.target.value)} /></label>
        
        <div className="number-grid">
          <label>Horário<input type="time" value={draft.time} onChange={(e) => updateDraft('time', e.target.value)} /></label>
          <label>Duração
            <select value={draft.duration} onChange={(e) => updateDraft('duration', e.target.value)}>
              {[15, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
            </select>
          </label>
          <label>Repetir por (semanas)
            <input type="number" min="1" max="52" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
          </label>
        </div>

        <label>Dias da semana</label>
        <div className="day-picker" style={{ marginBottom: '12px' }}>
          {weekDays.map((day) => (
            <button 
              type="button" 
              className={selectedDays.includes(day) ? 'selected' : ''} 
              onClick={() => toggleDay(day)} 
              key={day}
            >
              {day}
            </button>
          ))}
        </div>

        <label>Links em nuvem<input value={draft.links} onChange={(e) => updateDraft('links', e.target.value)} /></label>
        <label>Metodologia<textarea value={draft.methodology} onChange={(e) => updateDraft('methodology', e.target.value)} /></label>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="primary-action" type="submit" style={{ flex: 1 }}>
            <Plus size={18} /> {editingId ? "Salvar Alterações" : "Gerar cronograma de estudos"}
          </button>
          {editingId && (
            <button className="primary-action danger-button" type="button" onClick={() => { setEditingId(null); setDraft({ subject: '', links: '', methodology: '', time: '18:00', duration: 45 }); }} style={{ flex: 0.3 }}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="study-list">
        {studies.map((study) => (
          <article className="study-card" key={study.id}>
            <div className="study-header">
              <h3 style={{ textTransform: 'none' }}>{study.subject}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ghost-icon" onClick={() => startEdit(study)}><NotebookPen size={14} /></button>
                <button className="ghost-icon" onClick={() => deleteStudy(study.id)} style={{ color: 'var(--crimson)' }}><X size={14} /></button>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{study.methodology}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem' }}>{study.days}</span>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--crimson)' }}>{study.weeks} SEMANAS</strong>
                <small style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{study.time} • {study.duration}m</small>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function UserManagement({ users, setUsers }) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');

  const addUser = (e) => {
    e.preventDefault();
    const username = newUsername.trim();
    const password = newPassword;
    if (!username || !password) return;
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      alert('Usuário já existe');
      return;
    }
    const newUser = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      username,
      password,
      role: newRole
    };
    setUsers([...users, newUser]);
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
  };

  const deleteUser = (id) => {
    if (id === 'admin') return;
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <section className="manager-grid">
      <form className="tool-panel" onSubmit={addUser}>
        <SectionTitle icon={Users} eyebrow="Administração" title="Criar Usuário" />
        <label>Nome de usuário<input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required /></label>
        <label>Senha<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label>
        <label>Cargo
          <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
            <option value="user">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button className="primary-action" type="submit"><Plus size={18} /> Cadastrar</button>
      </form>
      <div className="tool-panel wide">
        <SectionTitle icon={Users} eyebrow="Lista" title="Usuários Cadastrados" />
        <div className="task-list">
          {users.map(u => (
            <div key={u.id} className="task-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <div>
                <h3 style={{ textTransform: 'none' }}>{u.username}</h3>
                <span className="tag">{u.role}</span>
              </div>
              {u.id !== 'admin' && (
                <button className="ghost-icon" onClick={() => deleteUser(u.id)} style={{ color: 'var(--crimson)' }}>
                  <X size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Login({ onLogin, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const uInput = username.trim().toLowerCase();
    const user = users.find(u => u.username.trim().toLowerCase() === uInput && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '32px' }}>
          <img src="/imagens/logo_sem_fundo.png" alt="Trail" />
          <div><span>Trail</span></div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          <label>Usuário<input value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p style={{ color: 'var(--crimson)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
          <button className="primary-action xl" type="submit">Entrar no Sistema</button>
        </form>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
