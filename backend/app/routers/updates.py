from fastapi import APIRouter, HTTPException
from app.services.update_manager import UpdateManager

router = APIRouter()
update_manager = UpdateManager()

@router.get("/check")
def check_for_updates():
    """Check for available updates from GitHub"""
    try:
        status = update_manager.get_update_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check for updates: {str(e)}")

@router.get("/version")
def get_current_version():
    """Get the current version of the application"""
    try:
        version = update_manager.get_current_version()
        return {
            "version": version,
            "is_git_repo": (update_manager.version_file.parent / '.git').exists()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get version: {str(e)}")

@router.post("/apply")
def apply_update():
    """Apply the latest update"""
    try:
        result = update_manager.apply_update()
        
        if result.get("success"):
            # After successful update, install dependencies
            dep_result = update_manager.install_dependencies()
            if not dep_result.get("success"):
                result["dependency_warning"] = dep_result.get("error")
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply update: {str(e)}")

@router.post("/dependencies")
def update_dependencies():
    """Update Python dependencies"""
    try:
        result = update_manager.install_dependencies()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update dependencies: {str(e)}")
