import {currentProfile} from '@/lib/access';
import {ReportWorkspace} from '@/components/reports/report-workspace';
export default async function Page(){return <ReportWorkspace actor={await currentProfile()}/>}
