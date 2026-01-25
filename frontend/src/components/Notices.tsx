type Notice = {
  id: number;
  message: string;
  date: string;
};

const notices: Notice[] = [
  { id: 1, message: "Training on Thursday at 7pm", date: "2026-01-25" },
  { id: 2, message: "Match on Sunday – arrive by 10:30am", date: "2026-01-28" },
];

export function Notices() {
  return (
    <section>
      <h2>Team Notices</h2>
      <ul>
        {notices.map((notice) => (
          <li key={notice.id}>
            <strong>{notice.date}:</strong> {notice.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
