const fs = require('fs');
const file = 'src/components/CalendarView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace standard calendar with one having a custom toolbar
const replacement = `
const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    const date = moment(toolbar.date);
    return (
      <span className="text-xl font-bold text-white">
        {date.format('MMMM YYYY')}
      </span>
    );
  };

  return (
    <div className="flex justify-between items-center mb-4 rbc-toolbar custom-toolbar">
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded glass-panel hover:bg-white/10 transition-colors text-white" onClick={goToBack}>
          &#8592;
        </button>
        <button className="px-3 py-1 rounded glass-panel hover:bg-white/10 transition-colors text-white" onClick={goToCurrent}>
          Today
        </button>
        <button className="px-3 py-1 rounded glass-panel hover:bg-white/10 transition-colors text-white" onClick={goToNext}>
          &#8594;
        </button>
      </div>
      <div className="text-center">{label()}</div>
      <div className="flex gap-2 invisible md:visible">
        {/* Empty space to balance flex-between, or view toggles if we had them */}
      </div>
    </div>
  );
};

export default function CalendarView() {
`;

content = content.replace('export default function CalendarView() {', replacement);

const calendarTagReplacement = `<Calendar
        views={["month"]}
        popup={true}
        defaultView="month"
        components={{
          toolbar: CustomToolbar
        }}
        localizer={localizer}`;

content = content.replace(/<Calendar\s+views=\{\["month"\]\}\s+popup=\{true\}\s+defaultView="month"\s+localizer=\{localizer\}/, calendarTagReplacement);

fs.writeFileSync(file, content);
