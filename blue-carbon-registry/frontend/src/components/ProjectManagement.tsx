import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface ProjectManagementProps {
  user: {
    address: string;
    balance: string;
    tokenBalance: string;
    isOwner: boolean;
  };
  contracts: any;
  onTokensMinted?: () => Promise<void>;
}

interface Project {
  projectId: string;
  projectName: string;
  ngoName: string;
  carbonCredits: string;
  timestamp: number;
  isVerified: boolean;
  isRetired: boolean;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ user, contracts, onTokensMinted }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    projectId: '',
    projectName: '',
    ngoName: '',
    carbonCredits: ''
  });

  const loadProjects = useCallback(async () => {
    if (!contracts) return;
    
    setLoading(true);
    try {
      // const { carbonToken } = contracts;
      
      // Load sample projects (in a real app, you'd fetch from events or a database)
      const sampleProjects = [
        {
          projectId: 'MANGROVE_001',
          projectName: 'Mangrove Restoration Project - Sundarbans',
          ngoName: 'Green Earth Foundation',
          carbonCredits: '2500',
          timestamp: Date.now() - 86400000,
          isVerified: true,
          isRetired: false
        },
        {
          projectId: 'SEAGRASS_002',
          projectName: 'Seagrass Conservation - Andaman Islands',
          ngoName: 'Ocean Conservation Society',
          carbonCredits: '1800',
          timestamp: Date.now() - 172800000,
          isVerified: true,
          isRetired: false
        },
        {
          projectId: 'SALTMARSH_003',
          projectName: 'Salt Marsh Protection - Gulf of Mexico',
          ngoName: 'Coastal Guardians NGO',
          carbonCredits: '1200',
          timestamp: Date.now() - 259200000,
          isVerified: true,
          isRetired: false
        }
      ];
      
      setProjects(sampleProjects);
      
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  }, [contracts]);

  useEffect(() => {
    loadProjects();
  }, [contracts, loadProjects]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contracts || !user.isOwner) return;
    
    try {
      const { carbonToken } = contracts;
      
      await carbonToken.createProject(
        newProject.projectId,
        newProject.projectName,
        newProject.ngoName,
        ethers.parseEther(newProject.carbonCredits)
      );
      
      // Reset form
      setNewProject({
        projectId: '',
        projectName: '',
        ngoName: '',
        carbonCredits: ''
      });
      setShowCreateForm(false);
      
      // Reload projects
      loadProjects();
      
      alert('Project created successfully!');
      
    } catch (error: any) {
      alert('Error creating project: ' + error.message);
    }
  };

  const verifyProject = async (projectId: string, ngoWallet: string) => {
    if (!contracts || !user.isOwner) return;
    
    try {
      const { carbonToken } = contracts;
      
      await carbonToken.verifyProjectAndMint(projectId, ngoWallet);
      
      // Reload projects
      loadProjects();
      
      // Refresh user data to update header token balance
      if (onTokensMinted) {
        await onTokensMinted();
      }
      
      alert('Project verified and tokens minted!');
      
    } catch (error: any) {
      alert('Error verifying project: ' + error.message);
    }
  };

  const reviewProject = (project: Project) => {
    // Store project data in localStorage
    const projectData = {
      projectId: project.projectId,
      projectName: project.projectName,
      ngo: project.ngoName,
      carbonCredits: parseInt(project.carbonCredits),
      status: project.isVerified ? 'verified' : 'pending',
      location: 'India', // Default location
      submissionDate: new Date(project.timestamp).toISOString()
    };
    
    localStorage.setItem('currentProject', JSON.stringify(projectData));
    
    // Open report page in new tab with project ID
    window.open(`http://localhost:8000/report.html?projectId=${project.projectId}`, '_blank');
  };

  if (loading) {
    return (
      <div className="project-management">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="project-management">
      <div className="project-header">
        <h2>Project Management</h2>
        <p>Manage carbon credit projects and verification</p>
        
        {user.isOwner && (
          <button 
            onClick={() => setShowCreateForm(true)}
            className="create-project-btn"
          >
            + Create New Project
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="create-project-modal">
          <div className="modal-content">
            <h3>Create New Project</h3>
            <form onSubmit={createProject}>
              <div className="form-group">
                <label>Project ID:</label>
                <input
                  type="text"
                  value={newProject.projectId}
                  onChange={(e) => setNewProject({...newProject, projectId: e.target.value})}
                  placeholder="e.g., MANGROVE_001"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Project Name:</label>
                <input
                  type="text"
                  value={newProject.projectName}
                  onChange={(e) => setNewProject({...newProject, projectName: e.target.value})}
                  placeholder="e.g., Mangrove Restoration Project"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>NGO Name:</label>
                <input
                  type="text"
                  value={newProject.ngoName}
                  onChange={(e) => setNewProject({...newProject, ngoName: e.target.value})}
                  placeholder="e.g., Green Earth Foundation"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Carbon Credits:</label>
                <input
                  type="number"
                  value={newProject.carbonCredits}
                  onChange={(e) => setNewProject({...newProject, carbonCredits: e.target.value})}
                  placeholder="e.g., 1000"
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="submit" className="submit-btn">
                  Create Project
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowCreateForm(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="projects-list">
        <h3>Carbon Credit Projects</h3>
        
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>No projects found.</p>
            {user.isOwner && <p>Create your first project to get started.</p>}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project.projectId} className="project-card">
                <div className="project-header">
                  <h4>{project.projectName}</h4>
                  <span className={`status-badge ${project.isVerified ? 'verified' : 'pending'}`}>
                    {project.isVerified ? '✅ Verified' : '⏳ Pending'}
                  </span>
                </div>
                
                <div className="project-details">
                  <div className="detail-item">
                    <span className="label">Project ID:</span>
                    <span className="value">{project.projectId}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">NGO:</span>
                    <span className="value">{project.ngoName}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Carbon Credits:</span>
                    <span className="value">{project.carbonCredits} NCT</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">CO₂e Equivalent:</span>
                    <span className="value">{parseFloat(project.carbonCredits) * 3994} tons</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="label">Created:</span>
                    <span className="value">
                      {new Date(project.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {user.isOwner && !project.isVerified && (
                  <div className="project-actions">
                    <button 
                      onClick={() => {
                        const ngoWallet = prompt('Enter NGO wallet address:');
                        if (ngoWallet) {
                          verifyProject(project.projectId, ngoWallet);
                        }
                      }}
                      className="verify-btn"
                    >
                      Verify & Mint Tokens
                    </button>
                    <button 
                      onClick={() => reviewProject(project)}
                      className="review-btn"
                    >
                      Review Project
                    </button>
                  </div>
                )}
                
                {project.isVerified && (
                  <div className="project-status">
                    <p className="success-text">
                      ✅ Project verified and tokens minted to NGO wallet
                    </p>
                    <button 
                      onClick={() => reviewProject(project)}
                      className="review-btn"
                    >
                      View Report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectManagement;
