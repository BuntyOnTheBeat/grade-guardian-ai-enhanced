interface FeedbackItem {
  type: 'strength' | 'improvement' | 'suggestion';
  title: string;
  description: string;
  explanation: string;
  location?: string;
  rubric_criteria?: string;
  original_text?: string;
  suggested_text?: string;
}

interface PDFReportData {
  assignmentName: string;
  fileName: string;
  feedback: FeedbackItem[];
  originalText?: string;
  editableText?: string;
  rubricCriteria?: string;
}

export const generatePDFReport = async (data: PDFReportData) => {
  // Parse editable text to extract changes
  const parseEditableText = (editableText: string) => {
    const changes = [];
    const regex = /<<<([^>]+)>>>(\+\+\+([^+]+)\+\+\+)?/g;
    let match;
    
    while ((match = regex.exec(editableText)) !== null) {
      changes.push({
        original: match[1],
        replacement: match[3] || '[DELETE]',
        context: editableText.substring(Math.max(0, match.index - 50), match.index + match[0].length + 50)
      });
    }
    
    return changes;
  };

  const changes = data.editableText ? parseEditableText(data.editableText) : [];
  
  // Create a comprehensive HTML content for the PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Detailed Homework Feedback Report</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6; 
          color: #2d3748; 
          max-width: 900px; 
          margin: 0 auto; 
          padding: 40px 20px;
          background: #ffffff;
        }
        .header { 
          text-align: center; 
          border-bottom: 4px solid #3182ce; 
          padding-bottom: 30px; 
          margin-bottom: 40px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          border-radius: 12px;
          margin: -20px -20px 40px -20px;
        }
        .header h1 {
          font-size: 2.5em;
          margin: 0 0 10px 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .header p {
          font-size: 1.2em;
          margin: 0;
          opacity: 0.9;
        }
        .assignment-info { 
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          padding: 25px; 
          border-radius: 12px; 
          margin-bottom: 40px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .assignment-info h2 {
          color: #2d3748;
          margin-top: 0;
          border-bottom: 2px solid #3182ce;
          padding-bottom: 10px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        .info-item {
          background: white;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #3182ce;
        }
        .feedback-section { 
          margin-bottom: 40px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .section-header {
          padding: 20px 25px;
          margin: 0;
          font-size: 1.4em;
          font-weight: bold;
          color: white;
          display: flex;
          align-items: center;
        }
        .strengths-header { background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); }
        .improvements-header { background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%); }
        .suggestions-header { background: linear-gradient(135deg, #3182ce 0%, #2c5aa0 100%); }
        .feedback-item { 
          margin: 0;
          padding: 25px;
          border-bottom: 1px solid #e2e8f0;
          position: relative;
        }
        .feedback-item:last-child {
          border-bottom: none;
        }
        .feedback-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
        }
        .strength-item::before { background: #38a169; }
        .improvement-item::before { background: #ed8936; }
        .suggestion-item::before { background: #3182ce; }
        .badge { 
          display: inline-block; 
          padding: 6px 14px; 
          border-radius: 20px; 
          font-size: 11px; 
          font-weight: bold; 
          margin-bottom: 15px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .strength-badge { background: #c6f6d5; color: #22543d; border: 1px solid #9ae6b4; }
        .improvement-badge { background: #fed7cc; color: #7b341e; border: 1px solid #fbb6ce; }
        .suggestion-badge { background: #bee3f8; color: #2a4365; border: 1px solid #90cdf4; }
        .location { 
          float: right; 
          font-size: 12px; 
          color: #718096; 
          background: #f7fafc;
          padding: 4px 8px;
          border-radius: 12px;
          margin-top: 5px; 
        }
        .feedback-title {
          font-size: 1.1em;
          font-weight: bold;
          color: #2d3748;
          margin: 0 0 10px 0;
        }
        .feedback-description {
          color: #4a5568;
          margin: 0 0 15px 0;
          font-size: 0.95em;
        }
        .explanation { 
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 20px; 
          border-radius: 8px; 
          margin-top: 15px; 
          border-left: 4px solid #6c757d;
          position: relative;
        }
        .explanation::before {
          content: '💡';
          position: absolute;
          top: 15px;
          left: -12px;
          background: white;
          border-radius: 50%;
          padding: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .explanation h4 { 
          margin: 0 0 12px 0; 
          color: #495057;
          font-size: 0.9em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .explanation p {
          margin: 0;
          color: #6c757d;
          font-style: italic;
        }
        .footer {
          margin-top: 60px;
          padding-top: 30px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
          color: #718096;
          background: #f7fafc;
          padding: 30px;
          border-radius: 12px;
        }
        .footer h3 {
          color: #2d3748;
          margin-bottom: 15px;
        }
        .ai-signature {
          margin-top: 20px;
          padding: 15px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          font-weight: bold;
        }
        .original-text-section {
          margin-bottom: 40px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .original-text-header {
          padding: 20px 25px;
          margin: 0;
          font-size: 1.4em;
          font-weight: bold;
          color: white;
          background: linear-gradient(135deg, #6b46c1 0%, #553c9a 100%);
          display: flex;
          align-items: center;
        }
        .original-text-content {
          padding: 25px;
          background: #f8f9fa;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          line-height: 1.8;
          white-space: pre-wrap;
          border-left: 4px solid #6b46c1;
        }
        .changes-section {
          margin-bottom: 40px;
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .changes-header {
          padding: 20px 25px;
          margin: 0;
          font-size: 1.4em;
          font-weight: bold;
          color: white;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          display: flex;
          align-items: center;
        }
        .change-item {
          padding: 20px 25px;
          border-bottom: 1px solid #e2e8f0;
          position: relative;
        }
        .change-item:last-child {
          border-bottom: none;
        }
        .change-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #dc2626;
        }
        .change-number {
          display: inline-block;
          background: #dc2626;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .change-text {
          background: #f1f5f9;
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        .original-text {
          background: #fee2e2;
          color: #991b1b;
          text-decoration: line-through;
          padding: 8px;
          border-radius: 4px;
          display: inline-block;
          margin-right: 10px;
        }
        .suggested-text {
          background: #dcfce7;
          color: #166534;
          padding: 8px;
          border-radius: 4px;
          display: inline-block;
          font-weight: bold;
        }
        .rubric-criteria {
          background: #fffbeb;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 12px;
          margin-top: 10px;
          font-size: 0.9em;
        }
        .rubric-criteria h5 {
          margin: 0 0 8px 0;
          color: #92400e;
          font-size: 0.85em;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .rubric-criteria p {
          margin: 0;
          color: #78350f;
          font-style: italic;
        }
        @media print {
          body { padding: 20px; }
          .header { margin: 0 0 30px 0; }
          .feedback-section { break-inside: avoid; }
          .original-text-section { break-inside: avoid; }
          .changes-section { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📚 Comprehensive Feedback Report</h1>
        <p>AI-Powered Academic Analysis & Improvement Guide</p>
      </div>
      
      <div class="assignment-info">
        <h2>📋 Assignment Overview</h2>
        <div class="info-grid">
          <div class="info-item">
            <strong>Assignment:</strong> ${data.assignmentName}
          </div>
          <div class="info-item">
            <strong>File Name:</strong> ${data.fileName}
          </div>
          <div class="info-item">
            <strong>Analysis Date:</strong> ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <div class="info-item">
            <strong>Feedback Items:</strong> ${data.feedback.length} detailed points
          </div>
        </div>
      </div>

      ${data.originalText ? `
      <div class="original-text-section">
        <h2 class="original-text-header">
          📄 Original Submission
        </h2>
        <div class="original-text-content">${data.originalText}</div>
      </div>
      ` : ''}

      ${changes.length > 0 ? `
      <div class="changes-section">
        <h2 class="changes-header">
          ✏️ Suggested Changes & Locations
        </h2>
        ${changes.map((change, index) => `
          <div class="change-item">
            <span class="change-number">Change ${index + 1}</span>
            <div class="change-text">
              <span class="original-text">${change.original}</span>
              <span class="suggested-text">${change.replacement}</span>
            </div>
            <p><strong>Context:</strong> ...${change.context}...</p>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${data.rubricCriteria ? `
      <div class="feedback-section">
        <h2 class="section-header improvements-header">
          📋 Rubric Criteria Applied
        </h2>
        <div class="feedback-item">
          <div class="rubric-criteria">
            <h5>Grading Criteria Used:</h5>
            <p>${data.rubricCriteria}</p>
          </div>
        </div>
      </div>
      ` : ''}

      ${data.feedback.filter(item => item.type === 'strength').length > 0 ? `
      <div class="feedback-section">
        <h2 class="section-header strengths-header">
          ✅ Strengths & Achievements
        </h2>
        ${data.feedback.filter(item => item.type === 'strength').map(item => `
          <div class="feedback-item strength-item">
            <span class="badge strength-badge">Strength</span>
            ${item.location ? `<span class="location">📍 ${item.location}</span>` : ''}
            <h3 class="feedback-title">${item.title}</h3>
            <p class="feedback-description">${item.description}</p>
            
            <div class="explanation">
              <h4>Why This Works Well:</h4>
              <p>${item.explanation}</p>
            </div>
            ${item.rubric_criteria ? `
            <div class="rubric-criteria">
              <h5>Rubric Criteria Met:</h5>
              <p>${item.rubric_criteria}</p>
            </div>
            ` : ''}
            ${item.original_text && item.suggested_text ? `
            <div class="change-text">
              <strong>Original:</strong> <span class="original-text">${item.original_text}</span><br>
              <strong>Suggested:</strong> <span class="suggested-text">${item.suggested_text}</span>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${data.feedback.filter(item => item.type === 'improvement').length > 0 ? `
      <div class="feedback-section">
        <h2 class="section-header improvements-header">
          🎯 Areas for Improvement
        </h2>
        ${data.feedback.filter(item => item.type === 'improvement').map(item => `
          <div class="feedback-item improvement-item">
            <span class="badge improvement-badge">Needs Work</span>
            ${item.location ? `<span class="location">📍 ${item.location}</span>` : ''}
            <h3 class="feedback-title">${item.title}</h3>
            <p class="feedback-description">${item.description}</p>
            
            <div class="explanation">
              <h4>How to Improve:</h4>
              <p>${item.explanation}</p>
            </div>
            ${item.rubric_criteria ? `
            <div class="rubric-criteria">
              <h5>Rubric Criteria to Address:</h5>
              <p>${item.rubric_criteria}</p>
            </div>
            ` : ''}
            ${item.original_text && item.suggested_text ? `
            <div class="change-text">
              <strong>Original:</strong> <span class="original-text">${item.original_text}</span><br>
              <strong>Suggested:</strong> <span class="suggested-text">${item.suggested_text}</span>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${data.feedback.filter(item => item.type === 'suggestion').length > 0 ? `
      <div class="feedback-section">
        <h2 class="section-header suggestions-header">
          💡 Enhancement Suggestions
        </h2>
        ${data.feedback.filter(item => item.type === 'suggestion').map(item => `
          <div class="feedback-item suggestion-item">
            <span class="badge suggestion-badge">Suggestion</span>
            ${item.location ? `<span class="location">📍 ${item.location}</span>` : ''}
            <h3 class="feedback-title">${item.title}</h3>
            <p class="feedback-description">${item.description}</p>
            
            <div class="explanation">
              <h4>Implementation Ideas:</h4>
              <p>${item.explanation}</p>
            </div>
            ${item.rubric_criteria ? `
            <div class="rubric-criteria">
              <h5>Rubric Enhancement Opportunity:</h5>
              <p>${item.rubric_criteria}</p>
            </div>
            ` : ''}
            ${item.original_text && item.suggested_text ? `
            <div class="change-text">
              <strong>Original:</strong> <span class="original-text">${item.original_text}</span><br>
              <strong>Suggested:</strong> <span class="suggested-text">${item.suggested_text}</span>
            </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      <div class="footer">
        <h3>📈 Next Steps for Academic Success</h3>
        <p>Review each feedback point carefully and prioritize the improvement areas. Focus on addressing the most critical issues first, then work on implementing the suggestions for enhanced quality.</p>
        
        <div class="ai-signature">
          🤖 Generated by My HW Checker - Your AI Academic Assistant
        </div>
      </div>
    </body>
    </html>
  `;

  // Create a blob and download it
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.assignmentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_detailed_feedback_report.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadEditableText = (fileName: string, editableText: string) => {
  // Parse and format the editable text with clear change markers
  const parseAndFormatText = (text: string) => {
    let formattedText = `HOMEWORK REVISION GUIDE\n`;
    formattedText += `File: ${fileName}\n`;
    formattedText += `Generated: ${new Date().toLocaleString()}\n`;
    formattedText += `${'='.repeat(80)}\n\n`;
    
    formattedText += `INSTRUCTIONS:\n`;
    formattedText += `- Text marked with [ORIGINAL] should be replaced with [SUGGESTED]\n`;
    formattedText += `- Text marked with [DELETE] should be removed\n`;
    formattedText += `- Follow the suggestions to improve your assignment\n\n`;
    formattedText += `${'='.repeat(80)}\n\n`;
    
    const regex = /<<<([^>]+)>>>(\+\+\+([^+]+)\+\+\+)?/g;
    let match;
    let changeNumber = 1;
    let lastIndex = 0;
    
    while ((match = regex.exec(text)) !== null) {
      // Add unchanged text before this change
      const unchangedText = text.substring(lastIndex, match.index);
      if (unchangedText.trim()) {
        formattedText += unchangedText;
      }
      
      // Add change marker
      formattedText += `\n\n[CHANGE ${changeNumber}]\n`;
      formattedText += `${'-'.repeat(40)}\n`;
      formattedText += `[ORIGINAL]: ${match[1]}\n`;
      
      if (match[3]) {
        formattedText += `[SUGGESTED]: ${match[3]}\n`;
      } else {
        formattedText += `[SUGGESTED]: [DELETE THIS TEXT]\n`;
      }
      
      formattedText += `${'-'.repeat(40)}\n\n`;
      
      changeNumber++;
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining unchanged text
    const remainingText = text.substring(lastIndex);
    if (remainingText.trim()) {
      formattedText += remainingText;
    }
    
    formattedText += `\n\n${'='.repeat(80)}\n`;
    formattedText += `END OF REVISION GUIDE\n`;
    formattedText += `Total Changes: ${changeNumber - 1}\n`;
    
    return formattedText;
  };

  const formattedText = parseAndFormatText(editableText);

  const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName.split('.')[0]}_revision_guide.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
