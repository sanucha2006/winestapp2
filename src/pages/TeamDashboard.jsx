import { useState } from 'react'
import {
  Users,
  Sparkles,
  Layers,
  ChevronRight,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'

const initialTasks = [
  { id: 1, title: 'Summer Outfit Art Commission', talent: 'Hoshina Yuki', category: 'Art', status: 'todo', priority: 'High' },
  { id: 2, title: 'Vtube Studio 2D Model Rigging V2', talent: 'Aoi Kuroha', category: 'Rigging', status: 'progress', priority: 'Urgent' },
  { id: 3, title: 'TikTok Highlight Clip Edit', talent: 'Kage Akuma', category: 'Video', status: 'progress', priority: 'Medium' },
  { id: 4, title: 'Debut Merchandise Design Assets', talent: 'Sakura Mochi', category: 'Merch', status: 'done', priority: 'Low' },
  { id: 5, title: 'Schedule Overlay Design Updates', talent: 'Hoshina Yuki', category: 'Overlay', status: 'todo', priority: 'Medium' },
]

export default function TeamDashboard() {
  const [tasks, setTasks] = useState(initialTasks)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskTalent, setNewTaskTalent] = useState('Hoshina Yuki')
  const [newTaskCategory, setNewTaskCategory] = useState('Art')

  // Move task status forward
  const handleNextStatus = (taskId) => {
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const nextStatus =
            task.status === 'todo'
              ? 'progress'
              : task.status === 'progress'
              ? 'done'
              : 'done'
          return { ...task, status: nextStatus }
        }
        return task
      })
    )
  }

  // Create new task
  const handleCreateTask = (e) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    const newTask = {
      id: tasks.length + 1,
      title: newTaskTitle,
      talent: newTaskTalent,
      category: newTaskCategory,
      status: 'todo',
      priority: 'Medium',
    }

    setTasks([...tasks, newTask])
    setNewTaskTitle('')
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-500/10 text-red-400 border border-red-500/20'
      case 'High':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'Medium':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    }
  }

  // Filter lists
  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const progressTasks = tasks.filter((t) => t.status === 'progress')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  return (
    <div className="p-8 animate-in fade-in max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff Board</h1>
            <p className="text-gray-400 text-sm">Collaborative workspace & task pipelines for agency assets.</p>
          </div>
        </div>
      </div>

      {/* Task Creation Inline Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-white font-bold text-sm mb-3.5 flex items-center gap-2">
          <Layers size={14} className="text-indigo-400" />
          <span>Quick Create Pipeline Task</span>
        </h3>
        
        <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          {/* Title Input */}
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs text-gray-500 font-semibold">Task Title</label>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g., Summer Outfit Rigging..."
              required
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>

          {/* Assigned Talent */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500 font-semibold">Assigned VTuber</label>
            <select
              value={newTaskTalent}
              onChange={(e) => setNewTaskTalent(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option>Hoshina Yuki</option>
              <option>Aoi Kuroha</option>
              <option>Sakura Mochi</option>
              <option>Kage Akuma</option>
            </select>
          </div>

          {/* Create Button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-950/50"
          >
            Create Task
          </button>
        </form>
      </div>

      {/* Kanban Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: TO DO */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-glow-purple" />
              <h3 className="text-white font-bold text-sm">To Do</h3>
            </div>
            <span className="text-xs text-gray-500 font-bold bg-gray-950 px-2 py-0.5 rounded-md">
              {todoTasks.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {todoTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-gray-900 border border-gray-800/60 rounded-xl p-4 hover:border-indigo-500/20 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-950 px-2 py-0.5 rounded">
                      {task.category}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-white font-semibold text-xs leading-snug mb-3">
                    {task.title}
                  </h4>
                </div>

                <div className="border-t border-gray-800/50 pt-2.5 mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Assigned: {task.talent}</span>
                  <button 
                    onClick={() => handleNextStatus(task.id)}
                    className="p-1 rounded-lg bg-gray-850 hover:bg-indigo-600 text-gray-400 hover:text-white transition-colors duration-150"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: IN PROGRESS */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-white font-bold text-sm">In Progress</h3>
            </div>
            <span className="text-xs text-gray-500 font-bold bg-gray-950 px-2 py-0.5 rounded-md">
              {progressTasks.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {progressTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-gray-900 border border-gray-800/60 rounded-xl p-4 hover:border-amber-500/20 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-950 px-2 py-0.5 rounded">
                      {task.category}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <h4 className="text-white font-semibold text-xs leading-snug mb-3">
                    {task.title}
                  </h4>
                </div>

                <div className="border-t border-gray-800/50 pt-2.5 mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Assigned: {task.talent}</span>
                  <button 
                    onClick={() => handleNextStatus(task.id)}
                    className="p-1 rounded-lg bg-gray-850 hover:bg-amber-600 text-gray-400 hover:text-white transition-colors duration-150"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: DONE */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-white font-bold text-sm">Done</h3>
            </div>
            <span className="text-xs text-gray-500 font-bold bg-gray-950 px-2 py-0.5 rounded-md">
              {doneTasks.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {doneTasks.map((task) => (
              <div 
                key={task.id} 
                className="bg-gray-900/40 border border-gray-800/35 rounded-xl p-4 hover:border-emerald-500/20 transition-all duration-200 group flex flex-col justify-between opacity-80 hover:opacity-100"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-950 px-2 py-0.5 rounded">
                      {task.category}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Done
                    </span>
                  </div>
                  <h4 className="text-white/80 line-through font-semibold text-xs leading-snug mb-3">
                    {task.title}
                  </h4>
                </div>

                <div className="border-t border-gray-800/50 pt-2.5 mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Assigned: {task.talent}</span>
                  <span className="text-emerald-500 flex items-center gap-0.5">
                    <CheckCircle2 size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
