const renderMiRNAInfo = (miRNAs) => {
  return (
    <div>
      <h4>关联miRNA:</h4>
      <ul>
        {miRNAs.map((miRNA, index) => (
          <li key={index}>
            <a href={miRNA.url} target="_blank" rel="noopener noreferrer">
              {miRNA.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}; 