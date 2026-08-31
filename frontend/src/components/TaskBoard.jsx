import TaskCard from "./TaskCard.jsx";
import { STATUS_LABELS } from "../utils.js";

const COLUMNS = ["todo", "in_progress", "done"];

export default function TaskBoard({ tasks, onMove, onSelect }) {
  function handleDrop(e, status) {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (id) onMove(id, status);
  }

  return (
    <div className="board">
      {COLUMNS.map((status) => {
        const columnTasks = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            className={`board-column column-${status}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
          >
            <header className="column-header">
              <h2>{STATUS_LABELS[status]}</h2>
              <span className="column-count">{columnTasks.length}</span>
            </header>
            <div className="column-tasks">
              {columnTasks.length === 0 ? (
                <p className="column-empty">No tasks — drop one here or create a new task.</p>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onSelect(task)} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}