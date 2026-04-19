import requests
import json
import subprocess
import os
from typing import Dict, Optional
from pathlib import Path

class UpdateManager:
    """Service for checking and applying updates from GitHub"""
    
    def __init__(self, repo_url: str = "https://api.github.com/repos"):
        self.repo_url = repo_url
        self.repo_owner = "Gonhog-Creator"
        self.repo_name = "BudgetTool"
        self.version_file = Path(__file__).parent.parent.parent.parent / "VERSION"
    
    def get_current_version(self) -> str:
        """Get the current version of the application"""
        try:
            project_root = Path(__file__).parent.parent.parent.parent
            
            # Try to get version from git tags
            result = subprocess.run(
                ['git', 'describe', '--tags', '--abbrev=0'],
                cwd=project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                version = result.stdout.strip().lstrip('v')
                return version
        except:
            pass
        
        # Fallback to VERSION file
        if self.version_file.exists():
            with open(self.version_file, 'r') as f:
                return f.read().strip()
        
        return "1.0.0"
    
    def check_for_updates(self) -> Dict:
        """Check GitHub for available updates"""
        try:
            # Get latest release from GitHub
            url = f"{self.repo_url}/{self.repo_owner}/{self.repo_name}/releases/latest"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                release_data = response.json()
                latest_version = release_data.get('tag_name', '').lstrip('v')
                current_version = self.get_current_version()
                
                has_update = self._compare_versions(latest_version, current_version)
                
                return {
                    "has_update": has_update,
                    "current_version": current_version,
                    "latest_version": latest_version,
                    "release_notes": release_data.get('body', ''),
                    "download_url": release_data.get('html_url', ''),
                    "published_at": release_data.get('published_at', '')
                }
            else:
                return {
                    "has_update": False,
                    "error": f"Failed to check updates: HTTP {response.status_code}"
                }
        except Exception as e:
            return {
                "has_update": False,
                "error": f"Failed to check updates: {str(e)}"
            }
    
    def _compare_versions(self, latest: str, current: str) -> bool:
        """Compare version strings to check if update is available"""
        try:
            latest_parts = [int(x) for x in latest.split('.')]
            current_parts = [int(x) for x in current.split('.')]
            
            # Pad with zeros if needed
            max_len = max(len(latest_parts), len(current_parts))
            latest_parts.extend([0] * (max_len - len(latest_parts)))
            current_parts.extend([0] * (max_len - len(current_parts)))
            
            return latest_parts > current_parts
        except:
            return False
    
    def download_update(self, download_url: str, target_dir: Path) -> bool:
        """Download update from GitHub"""
        try:
            response = requests.get(download_url, stream=True)
            if response.status_code == 200:
                file_name = download_url.split('/')[-1]
                file_path = target_dir / file_name
                
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                return True
            return False
        except Exception as e:
            print(f"Error downloading update: {e}")
            return False
    
    def apply_update(self) -> Dict:
        """Apply the update by pulling from git or running update script"""
        try:
            project_root = Path(__file__).parent.parent.parent.parent
            
            # Check if this is a git repository
            if (project_root / '.git').exists():
                # Use git pull to update
                result = subprocess.run(
                    ['git', 'pull'],
                    cwd=project_root,
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    return {
                        "success": True,
                        "message": "Update applied successfully via git pull",
                        "output": result.stdout
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Git pull failed: {result.stderr}"
                    }
            else:
                # Not a git repo, would need to download and replace files
                # For now, return instructions
                return {
                    "success": False,
                    "error": "Not a git repository. Manual update required.",
                    "instructions": "Please clone the latest version from GitHub or download the release."
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to apply update: {str(e)}"
            }
    
    def install_dependencies(self) -> Dict:
        """Install/update Python dependencies after update"""
        try:
            project_root = Path(__file__).parent.parent.parent.parent
            backend_dir = project_root / "backend"
            
            result = subprocess.run(
                ['pip', 'install', '-r', 'requirements.txt'],
                cwd=backend_dir,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "message": "Dependencies updated successfully"
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to update dependencies: {result.stderr}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to update dependencies: {str(e)}"
            }
    
    def get_update_status(self) -> Dict:
        """Get comprehensive update status"""
        update_info = self.check_for_updates()
        update_info["is_git_repo"] = (Path(__file__).parent.parent.parent.parent / '.git').exists()
        return update_info
    
    def get_recent_commits(self) -> Dict:
        """Get recent commits from git"""
        try:
            project_root = Path(__file__).parent.parent.parent.parent
            
            # Get recent commits
            result = subprocess.run(
                ['git', 'log', '--oneline', '-10'],
                cwd=project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                commits = result.stdout.strip().split('\n')
                return {
                    "success": True,
                    "commits": commits
                }
            else:
                return {
                    "success": False,
                    "error": f"Failed to get commits: {result.stderr}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to get commits: {str(e)}"
            }
