import { FileText, Target, TrendingUp, Users } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";


export function TabsBar() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('performance');
  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        variant={activeTab === 'performance' ? 'default' : 'outline'}
        onClick={() => setActiveTab('performance')}
        className="flex items-center"
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        Performance
      </Button>
      <Button 
        variant="outline"
        onClick={() => navigate('/admin/users')}
        className="flex items-center"
      >
        <Users className="h-4 w-4 mr-2" />
        User Management
      </Button>
      <Button 
        variant="outline"
        onClick={() => navigate('/admin/teams')}
        className="flex items-center"
      >
        <Users className="h-4 w-4 mr-2" />
        Team Management
      </Button>
      <Button 
        variant="outline"
        onClick={() => navigate('/admin/iku')}
        className="flex items-center"
      >
        <Target className="h-4 w-4 mr-2" />
        Indikator Kinerja
      </Button> 
      <Button 
        variant="outline"
        onClick={() => navigate('/admin/targets')}
        className="flex items-center"
      >
        <Target className="h-4 w-4 mr-2" />
        Target Setting
      </Button>
      <Button 
        variant="outline"
        onClick={() => navigate('/admin/realization')}
        className="flex items-center"
      >
        <TrendingUp className="h-4 w-4 mr-2" />
        Realisasi
      </Button>
      <Button 
        variant="outline"
        onClick={() => navigate('/admin/reporting')}
        className="flex items-center"
      >
        <FileText className="h-4 w-4 mr-2" />
        Pelaporan
      </Button>
    </div>
  );
}
