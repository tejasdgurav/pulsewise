import React, { useState } from 'react';
import FileUpload from './FileUpload';
import Summary from './Summary';

function LandingPage() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-6">
        Upload or Drag-and-Drop Your Blood Report
      </h1>
      <FileUpload
        file={file}
        setFile={setFile}
        setSummary={setSummary}
      />
      {summary && <Summary summary={summary} />}
    </div>
  );
}

export default LandingPage;
