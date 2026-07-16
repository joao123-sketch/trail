import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './supabase';
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
  X,
  MessageCircle,
  Settings
} from 'lucide-react';
import './styles.css';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'tasks', label: 'Tarefas', icon: ClipboardList },
  { id: 'calendar', label: 'Calendário', icon: CalendarDays },
  { id: 'focus', label: 'Foco', icon: Focus },
  { id: 'journal', label: 'Diário', icon: NotebookPen },
  { id: 'studies', label: 'Estudos', icon: BookOpen },
  { id: 'menu', label: 'Cardápio', icon: Utensils },
  { id: 'workout', label: 'Treino', icon: Dumbbell },
  { id: 'settings', label: 'Configurações', icon: Settings }
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

  // Filter tasks that already exist in the database for this exact date
  const storedTasksForDate = tasks.filter(task => task.date === dateKey);

  // Since we don't have metadata columns in the DB, we match by title for routines
  const storedTitles = new Set(storedTasksForDate.map(t => t.title.toLowerCase()));

  // We exclude the 'deleted_occurrence' from the final list so they don't show up at all
  const visibleStoredTasks = storedTasksForDate.filter(t => t.type !== 'deleted_occurrence');

  const filteredHabits = habits
    .filter(h => h.days.includes(dayName) && !storedTitles.has(h.name.toLowerCase()))
    .map(h => {
      const occurrenceKey = getOccurrenceKey('habit', h.id, dateKey);
      return {
        id: occurrenceKey,
        originalId: h.id,
        sourceType: 'habit',
        sourceId: h.id,
        occurrenceKey,
        date: dateKey,
        title: h.name,
        type: 'rotina',
        time: h.time,
        duration: h.duration || 60,
        completed: false,
        isHabit: true
      };
    });

  const filteredMeals = meals
    .filter(m => m.day === dayName && !storedTitles.has(`Nutrição: ${m.type} - ${m.description}`.toLowerCase()))
    .map(m => {
      const occurrenceKey = getOccurrenceKey('meal', m.id, dateKey);
      return {
        id: occurrenceKey,
        originalId: m.id,
        sourceType: 'meal',
        sourceId: m.id,
        occurrenceKey,
        date: dateKey,
        title: `Nutrição: ${m.type} - ${m.description}`,
        type: 'rotina',
        time: m.time,
        duration: 30,
        completed: false,
        isMeal: true
      };
    });

  const filteredWorkouts = workouts
    .filter(w => w.days.includes(dayName) && !storedTitles.has(`Treino: ${w.title}`.toLowerCase()))
    .map(w => {
      const occurrenceKey = getOccurrenceKey('workout', w.id, dateKey);
      return {
        id: occurrenceKey,
        originalId: w.id,
        sourceType: 'workout',
        sourceId: w.id,
        occurrenceKey,
        date: dateKey,
        title: `Treino: ${w.title}`,
        type: 'rotina',
        time: w.time,
        duration: 60,
        completed: false,
        isWorkout: true
      };
    });

  return [...visibleStoredTasks, ...filteredHabits, ...filteredMeals, ...filteredWorkouts].sort((a, b) => a.time.localeCompare(b.time));
};

const initialTasks = [];
const initialHabits = [];
const initialStudies = [];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // --- NUCLEAR CLEANUP (One-time) ---
  useEffect(() => {
    const hasCleaned = localStorage.getItem('trail_cleanup_v2');
    if (!hasCleaned) {
      // Clear legacy storage that might contain phantom tasks
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('trail_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('trail_cleanup_v2', 'true');
      console.log('Storage cleaned. Please refresh one last time.');
    }
  }, []);
  // ----------------------------------

  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }
    });

    // 1. Verificar se já existe uma sessão ativa no Supabase ao carregar
    async function recoverSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          username: session.user.email.split('@')[0],
          role: session.user.email.includes('admin') ? 'admin' : 'user'
        });
      }
      setAuthChecked(true);
    }
    recoverSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

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
    async function loadData() {
      if (!currentUser) {
        localStorage.removeItem('trail_current_user');
        return;
      }

      localStorage.setItem('trail_current_user', JSON.stringify(currentUser));
      const uId = currentUser.id;

      // 1. Carregar Tarefas do Supabase
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', uId);

      if (!tasksError) {
        setTasks(dbTasks || []);
      }

      // 2. Carregar Hábitos do Supabase
      const { data: dbHabits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', uId);

      if (!habitsError) {
        setHabits(dbHabits || []);
      }

      // 3. Carregar Diário do Supabase
      const { data: dbJournal, error: journalError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', uId);
      
      if (!journalError) {
        setJournalEntries(dbJournal || []);
      }

      // 4. Carregar Cardápio do Supabase
      const { data: dbMeals, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', uId);
      
      if (!mealsError) {
        setMeals(dbMeals || []);
      }

      // 5. Carregar Treinos do Supabase
      const { data: dbWorkouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', uId);
      
      if (!workoutsError) {
        setWorkouts(dbWorkouts || []);
      }

      // 6. Carregar Estudos do Supabase
      const { data: dbStudies, error: studiesError } = await supabase
        .from('studies')
        .select('*')
        .eq('user_id', uId);
      
      if (!studiesError) {
        setStudies(dbStudies.length > 0 ? dbStudies : initialStudies);
      }
    }

    loadData();
  }, [currentUser]);

  // Removemos o useEffect que salvava tarefas no localStorage automaticamente
  // useEffect(() => {
  //   if (currentUser) localStorage.setItem(`trail_${currentUser.id}_tasks`, JSON.stringify(tasks));
  // }, [tasks, currentUser]);

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
  }, [tasks, habits, meals, workouts]);

  const metrics = useMemo(() => {
    const total = todaysTasks.length;
    if (total === 0) return { total: 0, completed: 0, pending: 0, routines: 0, adHoc: 0, completionRate: 0 };
    
    const completed = todaysTasks.filter(t => t.completed).length;
    const routines = todaysTasks.filter(t => t.type === 'rotina').length;
    
    return {
      total,
      completed,
      pending: total - completed,
      routines,
      adHoc: total - routines,
      completionRate: Math.round((completed / total) * 100)
    };
  }, [todaysTasks]);

  const toggleTask = async (task) => {
    const newCompletedStatus = !task.completed;
    const isGenerated = task.isHabit || task.isMeal || task.isWorkout;
    const isMock = typeof task.id === 'number'; // InitialTasks use numbers, DB uses strings/UUIDs
    const date = task.date || getDateKey();
    
    // 1. Optimistic Update
    setTasks(current => {
      const exists = current.find(t => t.id === task.id);
      if (exists) {
        return current.map(t => t.id === task.id ? { ...t, completed: newCompletedStatus } : t);
      } else if (isGenerated && newCompletedStatus) {
        return [...current, { ...task, completed: true }].sort((a, b) => a.time.localeCompare(b.time));
      }
      return current;
    });

    try {
      // If it's a generated task OR a mock task being marked for the first time
      if (isGenerated || (isMock && newCompletedStatus)) {
        if (newCompletedStatus) {
          // INSERT only columns that definitely exist in the DB
          const { data, error } = await supabase
            .from('tasks')
            .insert([{
              title: task.title,
              time: task.time,
              duration: Number(task.duration),
              date: date,
              completed: true,
              type: task.type || 'rotina',
              user_id: currentUser.id
            }])
            .select();

          if (error) throw error;
          
          if (data && data[0]) {
            setTasks(current => {
              const filtered = current.filter(t => t.id !== task.id);
              return [...filtered, data[0]].sort((a, b) => a.time.localeCompare(b.time));
            });
          }
        } else if (!isMock) {
          // Delete from DB if it was already persisted
          const { error } = await supabase.from('tasks').delete().eq('id', task.id);
          if (error) throw error;
          setTasks(current => current.filter(t => t.id !== task.id));
        }
      } else if (!isMock) {
        // Normal task UPDATE
        const { error } = await supabase
          .from('tasks')
          .update({ completed: newCompletedStatus })
          .eq('id', task.id);
        
        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao sincronizar tarefa:', error);
      // Revert optimistic update
      setTasks(current => {
        const exists = current.find(t => t.id === task.id);
        if (exists) {
          return current.map(t => t.id === task.id ? { ...t, completed: !newCompletedStatus } : t);
        } else if (isGenerated && newCompletedStatus) {
          return current.filter(t => t.id !== task.id);
        }
        return current;
      });
      alert('Erro ao atualizar tarefa. Verifique sua conexão.');
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

  const deleteTask = async (id, applyToAll) => {
    const taskToDelete = tasks.find(t => t.id === id) || todaysTasks.find(t => t.id === id);
    if (!taskToDelete) {
        // If not found in memory, still try to delete from DB as a last resort
        await supabase.from('tasks').delete().eq('id', id);
        setTasks(current => current.filter(t => t.id !== id));
        return;
    }

    const isGenerated = taskToDelete.isHabit || taskToDelete.isMeal || taskToDelete.isWorkout;

    try {
      // 1. Always attempt to delete from the tasks table
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;

      // 2. If it was a generated task (from habit/meal/workout), 
      // we must insert a 'deleted_occurrence' record to prevent it from being regenerated for this day.
      if (isGenerated) {
        await supabase.from('tasks').insert([{
          title: taskToDelete.title,
          time: taskToDelete.time,
          duration: taskToDelete.duration,
          date: taskToDelete.date || getDateKey(),
          completed: false,
          type: 'deleted_occurrence',
          user_id: currentUser.id
        }]);
      }
      
      setTasks(current => current.filter(t => t.id !== id));
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      alert('Erro ao deletar. Verifique sua conexão.');
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveView('dashboard');
  };

  if (!authChecked) return <div className="login-screen"><div className="login-card">Carregando sessão...</div></div>;

  if (isRecoveringPassword) {
    return <UpdatePassword onUpdated={() => setIsRecoveringPassword(false)} />;
  }

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
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
            toggleTask={toggleTask}
            deleteTask={deleteTask}
          />
        )}
        {activeView === 'focus' && <FocusModule tasks={tasks} onStart={setFocusSession} />}
        {activeView === 'calendar' && (
          <ExecutionCalendar 
            tasks={tasks} 
            habits={habits} 
            meals={meals} 
            workouts={workouts} 
            onToggleTask={toggleTask} 
            onDeleteTask={(id) => deleteTask(id, false)} 
            onEditTask={setEditingTask} 
          />
        )}
        {activeView === 'journal' && <Journal entries={journalEntries} setEntries={setJournalEntries} />}
        {activeView === 'studies' && <StudyBase studies={studies} setStudies={setStudies} setTasks={setTasks} />}
        {activeView === 'menu' && <MealPlanner meals={meals} setMeals={setMeals} />}
        {activeView === 'workout' && <WorkoutTracker workouts={workouts} setWorkouts={setWorkouts} />}
        {activeView === 'admin' && currentUser.role === 'admin' && <UserManagement users={users} setUsers={setUsers} />}
        {activeView === 'settings' && <SettingsTab user={currentUser} onLogout={handleLogout} />}
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
      <FeedbackWidget user={currentUser} />
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

  const addMeal = async (e) => {
    e.preventDefault();
    if (!description.trim() || selectedDays.length === 0) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newMeals = selectedDays.map(day => ({
      day,
      type: mealType,
      time,
      description,
      user_id: user.id
    }));
    
    const { data: savedMeals, error } = await supabase
      .from('meals')
      .insert(newMeals)
      .select();

    if (!error && savedMeals) {
      setMeals([...meals, ...savedMeals]);
      setDescription('');
    } else {
      console.error('Erro ao salvar refeição:', error);
    }
  };

  const deleteMeal = async (id) => {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id);

    if (!error) {
      setMeals(meals.filter(m => m.id !== id));
    } else {
      console.error('Erro ao deletar refeição:', error);
    }
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
  const [editingId, setEditingId] = useState(null);
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

  const saveWorkout = async (e) => {
    e.preventDefault();
    if (!title.trim() || selectedDays.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const validExercises = exerciseList.filter(ex => ex.name.trim());

    const workoutData = { 
      title, 
      time, 
      days: selectedDays.join(', '), 
      exercises: validExercises,
      user_id: user.id
    };

    if (editingId) {
      const { data, error } = await supabase
        .from('workouts')
        .update(workoutData)
        .eq('id', editingId)
        .select();

      if (!error && data) {
        setWorkouts(current => current.map(w => w.id === editingId ? data[0] : w));
        resetForm();
      } else {
        console.error('Erro ao atualizar treino:', error);
      }
    } else {
      const { data, error } = await supabase
        .from('workouts')
        .insert([workoutData])
        .select();

      if (!error && data) {
        setWorkouts([...workouts, data[0]]);
        resetForm();
      } else {
        console.error('Erro ao salvar treino:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setTime('07:00');
    setSelectedDays(['Seg']);
    setExerciseList([{ id: crypto.randomUUID(), name: '', sets: '', reps: '' }]);
  };

  const handleEdit = (workout) => {
    setEditingId(workout.id);
    setTitle(workout.title);
    setTime(workout.time);
    setSelectedDays(workout.days.split(', '));
    setExerciseList(workout.exercises.map(ex => ({ ...ex, id: ex.id || crypto.randomUUID() })));
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteWorkout = async (id) => {
    if (!confirm('Deseja excluir este treino?')) return;
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id);

    if (!error) {
      setWorkouts(workouts.filter(w => w.id !== id));
      if (editingId === id) resetForm();
    } else {
      console.error('Erro ao deletar treino:', error);
    }
  };

  return (
    <section className="manager-grid">
      <form className="tool-panel" onSubmit={saveWorkout}>
        <SectionTitle icon={Dumbbell} eyebrow="Performance" title={editingId ? "Editar Treino" : "Definir Treino"} />
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

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button className="primary-action" type="submit" style={{ flex: 1 }}>
            {editingId ? <Check size={18} /> : <Plus size={18} />} {editingId ? 'Atualizar Treino' : 'Cadastrar Treino'}
          </button>
          {editingId && (
            <button className="primary-action danger-button" type="button" onClick={resetForm} style={{ flex: 0.4 }}>
              Cancelar
            </button>
          )}
        </div>
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
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="ghost-icon" onClick={() => handleEdit(w)} style={{ width: '24px', height: '24px' }}>
                          <NotebookPen size={12} />
                        </button>
                        <button className="ghost-icon" onClick={() => deleteWorkout(w.id)} style={{ width: '24px', height: '24px', color: 'var(--crimson)' }}>
                          <X size={12} />
                        </button>
                      </div>
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
        <img src="/logo_sem_fundo.png" alt="Trail" />
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
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={() => onToggleTask(task)} />
            ))
          ) : (
            <div className="empty-state">
              <p>Nenhuma tarefa agendada para hoje.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="metrics-stack">
        <div className="pill-grid">
          <MetricPill label="Total" value={metrics.total} />
          <MetricPill label="Concluídas" value={metrics.completed} tone="success" />
          <MetricPill label="Pendentes" value={metrics.pending} tone="danger" />
        </div>
        
        <div className="metrics-visuals">
          <ProgressRing value={metrics.completionRate} />
          <div className="bar-metrics-container" style={{ display: 'grid', gap: '16px' }}>
            <BarMetric 
              title="Status das Tarefas" 
              leftLabel="Concluídas" 
              left={metrics.completed} 
              rightLabel="Pendentes" 
              right={metrics.pending} 
            />
            <BarMetric 
              title="Perfil de Execução" 
              leftLabel="Rotinas" 
              left={metrics.routines} 
              rightLabel="Avulsas" 
              right={metrics.adHoc} 
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskRow({ task, onToggle }) {
  return (
    <article 
      className={`task-row ${task.completed ? 'done' : ''}`} 
      onClick={onToggle} 
      style={{ cursor: 'pointer' }}
    >
      <div className="task-time-check">
        <button 
          className="check-button" 
          onClick={(e) => { e.stopPropagation(); onToggle(); }} 
          aria-label={task.completed ? 'Marcar como nao concluida' : 'Concluir tarefa'}
        >
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

function TaskManager({ habits, tasks, setHabits, setTasks, meals = [], workouts = [], onForceFriction, onEditTask, toggleTask, deleteTask }) {
  const [habitName, setHabitName] = useState('');
  const [habitTime, setHabitTime] = useState('06:00');
  const [habitDuration, setHabitDuration] = useState(30);
  const [selectedDays, setSelectedDays] = useState(['Seg', 'Qua', 'Sex']);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('16:00');
  const [taskDuration, setTaskDuration] = useState(30);
  const [taskDate, setTaskDate] = useState(getDateKey());

  const addHabit = async (event) => {
    event.preventDefault();
    if (!habitName.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Sessão expirada. Por favor, saia e entre novamente.');
      return;
    }

    const newHabit = {
      name: habitName,
      days: selectedDays,
      time: habitTime,
      duration: Number(habitDuration),
      user_id: user.id
    };

    const { data: savedHabit, error } = await supabase
      .from('habits')
      .insert([newHabit])
      .select();

    if (!error && savedHabit) {
      setHabits((current) => [...current, savedHabit[0]]);
      setHabitName('');
    } else {
      console.error('Erro ao salvar hábito:', error);
      alert('Erro no Supabase (Hábitos): ' + (error?.message || 'Erro desconhecido'));
    }
  };

  const addTask = async (event) => {
    event.preventDefault();
    if (!taskTitle.trim()) return;

    // Buscamos o ID real do usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Sessão expirada. Por favor, saia e entre novamente.');
      return;
    }

    const taskToSave = {
      title: taskTitle,
      type: 'avulsa',
      time: taskTime,
      date: taskDate,
      duration: Number(taskDuration),
      completed: false,
      user_id: user.id
    };

    const { data: savedTask, error } = await supabase
      .from('tasks')
      .insert([taskToSave])
      .select();

    if (!error && savedTask) {
      setTasks((current) => [
        ...current,
        savedTask[0]
      ].sort((a, b) => a.time.localeCompare(b.time)));
      setTaskTitle('');
    } else {
      console.error('Erro ao salvar tarefa:', error);
      alert('Erro no Supabase: ' + (error?.message || 'Erro desconhecido'));
    }
  };

  const toggleDay = (day) => {
    setSelectedDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day]));
  };

  const durationOptions = [15, 30, 45, 60];

  const deleteHabit = async (id) => {
    if (!confirm('Deseja excluir permanentemente este hábito?')) return;
    try {
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
      setHabits(current => current.filter(h => h.id !== id));
    } catch (error) {
      console.error('Erro ao deletar hábito:', error);
      alert('Erro ao excluir hábito do banco de dados.');
    }
  };

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
        <ExecutionCalendar 
          tasks={tasks} 
          habits={habits} 
          meals={meals} 
          workouts={workouts} 
          onToggleTask={toggleTask}
          onDeleteTask={(id) => deleteTask(id, false)}
          onEditTask={onEditTask} 
        />
      </div>

      <div className="tool-panel wide">
        <SectionTitle icon={RotateCcw} eyebrow="Ativos" title="Lista de Hábitos" />
        <div className="habit-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {habits.length > 0 ? (
            habits.map(h => (
              <div key={h.id} className="task-row" style={{ gridTemplateColumns: '1fr auto', padding: '12px' }}>
                <div>
                  <h3 style={{ textTransform: 'none' }}>{h.name}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span className="tag rotina">{h.time}</span>
                    <span className="tag avulsa" style={{ background: 'transparent', border: '1px solid var(--line)' }}>
                      {Array.isArray(h.days) ? h.days.join(', ') : h.days}
                    </span>
                  </div>
                </div>
                <button className="ghost-icon" onClick={() => deleteHabit(h.id)} style={{ color: 'var(--crimson)' }}>
                  <X size={18} />
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center', gridColumn: '1 / -1' }}>Nenhum hábito cadastrado.</p>
          )}
        </div>
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
  const [date, setDate] = useState(task.date || getDateKey());
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
  const [currentCycle, setCurrentCycle] = useState(1);
  const [isBreak, setIsBreak] = useState(false);
  const [seconds, setSeconds] = useState(session.study * 60);
  const audioRef = useRef(null);

  useEffect(() => {
    const playAudio = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        // Adjusting to match the actual files uploaded: focus.mp3 and break.mp3
        audioRef.current.src = isBreak ? '/break.mp3' : '/focus.mp3';
        audioRef.current.load();
        
        const startPlay = () => {
          audioRef.current.play().catch(e => {
            console.warn("Audio play blocked. User interaction required.");
          });
        };

        // Attempt play immediately, and also on first click to bypass browser policy
        startPlay();
        window.addEventListener('click', startPlay, { once: true });
      }
    };

    playAudio();
    
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          handlePeriodEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [isBreak, currentCycle]);

  const handlePeriodEnd = () => {
    if (!isBreak) {
      if (currentCycle < session.cycles) {
        setIsBreak(true);
        setSeconds(session.breakTime * 60);
      } else {
        alert('Sessão de foco concluída!');
        onExit();
      }
    } else {
      setIsBreak(false);
      setCurrentCycle(prev => prev + 1);
      setSeconds(session.study * 60);
    }
  };

  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  return (
    <main className="absolute-focus">
      <audio ref={audioRef} loop />
      <p className="eyebrow">{isBreak ? 'Intervalo' : 'Modo foco absoluto'}</p>
      <div className="focus-clock">{minutes}:{secs}</div>
      <h1>{isBreak ? 'RECARREGANDO ENERGIAS' : 'EXECUÇÃO EM ANDAMENTO'}</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Ciclo {currentCycle} de {session.cycles}</p>
      <button className="primary-action" onClick={onExit} style={{ background: 'transparent', width: 'auto', padding: '0 24px' }}>
        <Pause size={16} /> Interromper
      </button>
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



  const getAllTasksForDate = useCallback((date) => {
    return getGeneratedTasksForDate({ date, tasks, habits, meals, workouts });
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
                            <button onClick={(e) => { e.stopPropagation(); onToggleTask(task); }}><Check size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}><X size={14} /></button>
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

  const saveEntry = async () => {
    const content = editorRef.current.innerHTML;
    if (!title.trim() && !content.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (currentId) {
      const { error } = await supabase
        .from('journal_entries')
        .update({ title, content, image })
        .eq('id', currentId);
      
      if (!error) {
        setEntries(prev => prev.map(e => e.id === currentId ? { ...e, title, content, image } : e));
      }
    } else {
      const newEntry = {
        date: new Date().toLocaleDateString('pt-BR'),
        title: title || 'Sem título',
        content,
        image,
        user_id: user.id
      };

      const { data: savedEntry, error } = await supabase
        .from('journal_entries')
        .insert([newEntry])
        .select();

      if (!error && savedEntry) {
        setEntries(prev => [savedEntry[0], ...prev]);
        setCurrentId(savedEntry[0].id);
      }
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

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.subject.trim() || selectedDays.length === 0) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingId) {
      const updatedStudy = { ...draft, days: selectedDays.join(', '), weeks };
      const { error } = await supabase.from('studies').update(updatedStudy).eq('id', editingId);
      if (!error) {
        setStudies(current => current.map(s => s.id === editingId ? { ...updatedStudy, id: editingId } : s));
        setEditingId(null);
      }
    } else {
      const newStudy = { ...draft, days: selectedDays.join(', '), weeks, user_id: user.id };
      const { data: savedStudy, error: studyError } = await supabase.from('studies').insert([newStudy]).select();
      
      if (!studyError && savedStudy) {
        setStudies((current) => [...current, savedStudy[0]]);
        
        // Generate Avulsa Tasks
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
            const dateStr = getDateKey(date);
            
            newTasks.push({
              title: `Estudo: ${draft.subject}`,
              type: 'avulsa',
              time: draft.time,
              duration: Number(draft.duration),
              date: dateStr,
              completed: false,
              user_id: user.id
            });
          }
        });

        const { data: savedTasks, error: tasksError } = await supabase.from('tasks').insert(newTasks).select();
        if (!tasksError && savedTasks) {
          setTasks((current) => [...current, ...savedTasks].sort((a, b) => a.time.localeCompare(b.time)));
        }
      }
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

  const deleteStudy = async (id) => {
    if (confirm('Deseja excluir este planejamento? As tarefas já geradas no calendário permanecerão.')) {
      const { error } = await supabase.from('studies').delete().eq('id', id);
      if (!error) {
        setStudies(current => current.filter(s => s.id !== id));
      }
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

function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Se o usuário não digitar um @, assumimos o domínio @trail.com para facilitar
    const loginEmail = email.includes('@') ? email : `${email}@trail.com`;

    if (isResetting) {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setError('Erro: ' + error.message);
      } else {
        setError('Link de recuperação enviado para o seu e-mail!');
        setIsResetting(false);
      }
      setLoading(false);
    } else if (isRegistering) {
      const { data, error: authError } = await supabase.auth.signUp({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        setError('Erro ao cadastrar: ' + authError.message);
        setLoading(false);
      } else if (data.user) {
        if (data.session) {
          onLogin({
            id: data.user.id,
            username: data.user.email.split('@')[0],
            role: data.user.email.includes('admin') ? 'admin' : 'user'
          });
        } else {
          setError('Cadastro realizado! Verifique seu e-mail ou tente fazer login.');
          setLoading(false);
          setIsRegistering(false);
        }
      }
    } else {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) {
        setError('Credenciais inválidas: ' + authError.message);
        setLoading(false);
      } else if (data.user) {
        // Mapeamos o usuário do Supabase para o formato que o App já entende
        onLogin({
          id: data.user.id,
          username: data.user.email.split('@')[0],
          role: data.user.email.includes('admin') ? 'admin' : 'user'
        });
      }
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '40px', gap: '20px' }}>
          <img src="/logo_sem_fundo.png" alt="Trail" style={{ width: '120px', height: '120px' }} />
          <div><span style={{ fontSize: '4.5rem', fontWeight: 'bold', letterSpacing: '0' }}>Trail</span></div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {!isResetting && (
            <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          )}
          {error && <p style={{ color: 'var(--crimson)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
          <button className="primary-action xl" type="submit" disabled={loading}>
            {loading ? 'Aguarde...' : (isResetting ? 'Enviar Link' : (isRegistering ? 'Criar Conta' : 'Entrar no Sistema'))}
          </button>
        </form>
        <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            type="button" 
            className="ghost-icon" 
            onClick={() => { setIsRegistering(!isRegistering); setIsResetting(false); }}
            style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
          >
            {isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
          {!isRegistering && (
            <button 
              type="button" 
              className="ghost-icon" 
              onClick={() => { setIsResetting(!isResetting); setIsRegistering(false); }}
              style={{ width: '100%', padding: '10px', fontSize: '0.85rem', color: 'var(--muted)' }}
            >
              {isResetting ? 'Voltar para o Login' : 'Esqueci minha senha'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FeedbackWidget({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setStatus('sending');
    const { error } = await supabase.from('feedbacks').insert([{ 
      user_id: user.id, 
      content: text,
      created_at: new Date().toISOString()
    }]);

    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setText('');
        setStatus('idle');
      }, 2000);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            background: 'var(--apex)', 
            color: 'var(--obsidian)', 
            borderRadius: '50%', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            border: 'none',
            cursor: 'pointer'
          }}
          title="Enviar Feedback"
        >
          <MessageCircle size={20} />
        </button>
      )}
      {isOpen && (
        <div style={{
          background: 'var(--carbon)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          width: '300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          border: '1px solid var(--line)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--ice)' }}>Enviar Feedback</h4>
            <button className="ghost-icon" onClick={() => setIsOpen(false)} style={{ padding: '4px' }}>
              <X size={16} />
            </button>
          </div>
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O que está funcionando? O que pode melhorar?"
            rows={4}
            style={{ 
              width: '100%', 
              resize: 'none',
              background: 'var(--obsidian)',
              color: 'var(--ice)',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              padding: '8px',
              fontFamily: 'inherit'
            }}
          />
          {status === 'error' && <p style={{ color: 'var(--crimson)', fontSize: '0.8rem', margin: 0 }}>Erro ao enviar. Tente de novo.</p>}
          {status === 'success' && <p style={{ color: 'var(--apex)', fontSize: '0.8rem', margin: 0 }}>Obrigado pelo feedback!</p>}
          <button 
            className="primary-action" 
            onClick={handleSubmit} 
            disabled={status === 'sending' || status === 'success' || !text.trim()}
          >
            {status === 'sending' ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}
    </div>
  );
}

function UpdatePassword({ onUpdated }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      alert('Senha atualizada com sucesso!');
      onUpdated();
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '40px', gap: '20px' }}>
          <img src="/logo_sem_fundo.png" alt="Trail" style={{ width: '120px', height: '120px' }} />
          <div><span style={{ fontSize: '4.5rem', fontWeight: 'bold', letterSpacing: '0' }}>Trail</span></div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          <h3 style={{ textAlign: 'center', margin: 0 }}>Redefinir Senha</h3>
          <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--muted)', margin: 0 }}>Digite sua nova senha abaixo.</p>
          <label>Nova Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p style={{ color: 'var(--crimson)', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
          <button className="primary-action xl" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsTab({ user, onLogout }) {
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('idle');
  const [deleteStatus, setDeleteStatus] = useState('idle');

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    setPasswordStatus('loading');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordStatus('error');
      console.error(error);
    } else {
      setPasswordStatus('success');
      setNewPassword('');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('Tem certeza absoluta que deseja excluir sua conta? Esta ação não pode ser desfeita e apagará todos os seus dados.')) {
      setDeleteStatus('loading');
      const { error } = await supabase.rpc('delete_user');
      if (error) {
        console.error(error);
        setDeleteStatus('error');
        alert('Erro ao excluir conta. Certifique-se de que a função SQL "delete_user" foi criada no painel do Supabase.');
      } else {
        alert('Conta excluída com sucesso.');
        onLogout();
      }
    }
  };

  return (
    <section className="manager-grid">
      <div className="tool-panel">
        <SectionTitle icon={Settings} eyebrow="Configurações" title="Minha Conta" />
        
        <form onSubmit={handleUpdatePassword} style={{ display: 'grid', gap: '15px', marginBottom: '40px' }}>
          <h4 style={{ margin: 0, color: 'var(--ice)' }}>Mudar Senha</h4>
          <label>
            Nova Senha
            <input 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
            />
          </label>
          {passwordStatus === 'error' && <p style={{ color: 'var(--crimson)', fontSize: '0.8rem', margin: 0 }}>Erro ao atualizar senha.</p>}
          {passwordStatus === 'success' && <p style={{ color: 'var(--apex)', fontSize: '0.8rem', margin: 0 }}>Senha atualizada com sucesso!</p>}
          <button className="primary-action" type="submit" disabled={passwordStatus === 'loading'}>
            {passwordStatus === 'loading' ? 'Atualizando...' : 'Atualizar Senha'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--crimson)' }}>Zona de Perigo</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '15px' }}>
            Excluir sua conta removerá permanentemente todos os seus dados.
          </p>
          <button 
            className="primary-action" 
            onClick={handleDeleteAccount}
            disabled={deleteStatus === 'loading'}
            style={{ background: 'var(--crimson)', color: 'white' }}
          >
            {deleteStatus === 'loading' ? 'Excluindo...' : 'Excluir Minha Conta'}
          </button>
          {deleteStatus === 'error' && (
            <p style={{ color: 'var(--crimson)', fontSize: '0.8rem', marginTop: '10px' }}>
              Falha ao excluir.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
